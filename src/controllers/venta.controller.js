import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createVenta = async (req, res) => {
    const {
        idVenta,
        tipoTransaccion,
        estadoVenta,
        fecha,
        tipoMoneda,
        medioPago,
        total,
        vuelto,
        idCliente,
        nombreCliente,
        email,
        telefono,
        dni,
        idVendedor,
        idVentaRelacionada,
        datosArriendo,
        detalleVenta
    } = req.body;

    try {
        // Verificar si ya existe una venta con el mismo ID
        const existingVenta = await prisma.venta.findUnique({
            where: { idVenta }
        });

        if (existingVenta) {
            return res.status(400).json({
                message: 'Ya existe una venta con este ID'
            });
        }

        // Si es una devolución, verificar que exista la venta relacionada
        if (tipoTransaccion === 'Devolucion' && idVentaRelacionada) {
            const ventaOriginal = await prisma.venta.findUnique({
                where: { idVenta: idVentaRelacionada },
                include: {
                    detalleVenta: true
                }
            });

            if (!ventaOriginal) {
                return res.status(400).json({
                    message: 'La venta original no existe'
                });
            }

            // Verificar que los productos devueltos existan en la venta original
            for (const detalle of detalleVenta) {
                const detalleOriginal = ventaOriginal.detalleVenta.find(
                    d => d.idProducto === detalle.idProducto
                );

                if (!detalleOriginal) {
                    return res.status(400).json({
                        message: `El producto ${detalle.idProducto} no existe en la venta original`
                    });
                }

                if (detalle.cantidadDevuelta > detalleOriginal.cantidad) {
                    return res.status(400).json({
                        message: `La cantidad devuelta del producto ${detalle.idProducto} es mayor que la cantidad vendida`
                    });
                }
            }
        }

        // Verificar el stock de los productos
        if (tipoTransaccion === 'Arriendo') {
            for (const detalle of detalleVenta) {
                const producto = await prisma.product.findUnique({
                    where: { id: detalle.idProducto }
                });

                if (!producto) {
                    return res.status(400).json({
                        message: `El producto ${detalle.idProducto} no existe`
                    });
                }

                if (producto.stock < detalle.cantidad) {
                    return res.status(400).json({
                        message: `Stock insuficiente para el producto ${detalle.idProducto}`
                    });
                }
            }
        }

        // Crear la venta con todos sus detalles en una transacción
        const venta = await prisma.$transaction(async (prisma) => {
            // Crear la venta
            const nuevaVenta = await prisma.venta.create({
                data: {
                    idVenta,
                    tipoTransaccion,
                    estadoVenta,
                    fecha: new Date(fecha),
                    tipoMoneda,
                    medioPago,
                    total,
                    vuelto,
                    idCliente,
                    nombreCliente,
                    email,
                    telefono,
                    dni,
                    idVendedor,
                    idVentaRelacionada,
                    datosArriendo: datosArriendo ? {
                        create: {
                            fechaArriendo: new Date(datosArriendo.fechaArriendo),
                            fechaEntrega: new Date(datosArriendo.fechaEntrega),
                            patente: datosArriendo.patente
                        }
                    } : undefined,
                    detalleVenta: {
                        create: detalleVenta.map(detalle => ({
                            idDetalle: detalle.idDetalle,
                            idProducto: detalle.idProducto,
                            descripcionProducto: detalle.descripcionProducto,
                            precioUnitario: detalle.precioUnitario,
                            cantidad: detalle.cantidad,
                            precioTotal: detalle.precioTotal,
                            cantidadDevuelta: detalle.cantidadDevuelta,
                            estadoProducto: detalle.estadoProducto,
                            observacion: detalle.observacion,
                            detalleOriginalId: detalle.detalleOriginalId
                        }))
                    }
                },
                include: {
                    datosArriendo: true,
                    detalleVenta: true
                }
            });

            // Actualizar el stock de los productos
            for (const detalle of detalleVenta) {
                await prisma.product.update({
                    where: { id: detalle.idProducto },
                    data: {
                        stock: {
                            increment: tipoTransaccion === 'Devolucion' ? detalle.cantidadDevuelta : -detalle.cantidad
                        }
                    }
                });
            }

            return nuevaVenta;
        });

        res.status(201).json(venta);
    } catch (error) {
        console.error('Error al crear la venta:', error);
        res.status(500).json({
            message: 'Error al crear la venta',
            error: error.message
        });
    }
}; 