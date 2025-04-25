import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const sortBy = req.query.sortBy || 'createdAt';
    const order = req.query.order?.toLowerCase() === 'asc' ? 'asc' : 'desc';

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: {
          OR: [
            { name: { contains: search } },
            { description: { contains: search } },
            { type: { contains: search } }
          ]
        },
        orderBy: { [sortBy]: order },
        skip,
        take: limit,
      }),
      prisma.product.count({
        where: {
          OR: [
            { name: { contains: search } },
            { description: { contains: search } },
            { type: { contains: search } }
          ]
        }
      })
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({ 
      message: 'Error al obtener los productos',
      error: error.message 
    });
  }
};

export const getProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
    });
    
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createProduct = async (req, res) => {
  try {
    const { name, description, type, priceUSD, priceCLP, priceBRL, stock, imageUrl } = req.body;

    // Validaciones
    if (!name || !description || !type || priceUSD === undefined || priceCLP === undefined || priceBRL === undefined || stock === undefined) {
      return res.status(400).json({ 
        message: 'Todos los campos son requeridos excepto imageUrl' 
      });
    }

    if (priceUSD < 0 || priceCLP < 0 || priceBRL < 0) {
      return res.status(400).json({ 
        message: 'Los precios no pueden ser negativos' 
      });
    }

    if (stock < 0) {
      return res.status(400).json({ 
        message: 'El stock no puede ser negativo' 
      });
    }

    // Verificar si ya existe un producto con el mismo nombre
    const existingProduct = await prisma.product.findUnique({
      where: { name }
    });

    if (existingProduct) {
      return res.status(400).json({ 
        message: 'Ya existe un producto con este nombre' 
      });
    }

    const product = await prisma.product.create({
      data: {
        name,
        description,
        type,
        priceUSD: parseFloat(priceUSD),
        priceCLP: parseFloat(priceCLP),
        priceBRL: parseFloat(priceBRL),
        stock: parseInt(stock),
        imageUrl,
      },
    });
    
    res.status(201).json(product);
  } catch (error) {
    console.error('Error al crear producto:', error);
    res.status(400).json({ 
      message: 'Error al crear el producto',
      error: error.message 
    });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, type, priceUSD, priceCLP, priceBRL, stock, imageUrl } = req.body;
    
    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(type && { type }),
        ...(priceUSD && { priceUSD: parseFloat(priceUSD) }),
        ...(priceCLP && { priceCLP: parseFloat(priceCLP) }),
        ...(priceBRL && { priceBRL: parseFloat(priceBRL) }),
        ...(stock && { stock: parseInt(stock) }),
        ...(imageUrl && { imageUrl }),
      },
    });
    
    res.json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.product.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}; 