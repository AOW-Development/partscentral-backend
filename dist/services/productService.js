"use strict";
// import { prisma } from './prisma';
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteVariant = exports.updateVariant = exports.createVariant = exports.deleteProduct = exports.createListing = exports.getAllProducts = exports.getGroupedProductWithSubPartsV2 = exports.getGroupedProductWithSubParts = exports.getProductsWithSubPartsByVehicle = exports.getProductsByVehicle = void 0;
const prisma_1 = require("./prisma");
const getProductsByVehicle = async ({ make, model, year, part, }) => {
    return prisma_1.prisma.product.findMany({
        where: {
            modelYear: {
                model: {
                    name: model,
                    make: { name: make },
                },
                year: { value: year },
            },
            partType: { name: part },
        },
        include: {
            images: true,
            inventory: true,
            // add more relations if needed
        },
    });
};
exports.getProductsByVehicle = getProductsByVehicle;
const getProductsWithSubPartsByVehicle = async ({ make, model, year, part, }) => {
    return prisma_1.prisma.product.findMany({
        where: {
            modelYear: {
                model: {
                    name: model,
                    make: { name: make },
                },
                year: { value: year },
            },
            partType: { name: part },
        },
        include: {
            images: true,
            inventory: true,
            subParts: true, // include subParts in the result
            modelYear: {
                include: {
                    model: {
                        include: {
                            make: true,
                        },
                    },
                    year: true,
                },
            },
            partType: true,
        },
    });
};
exports.getProductsWithSubPartsByVehicle = getProductsWithSubPartsByVehicle;
const getGroupedProductWithSubParts = async ({ make, model, year, part, }) => {
    const products = await prisma_1.prisma.product.findMany({
        where: {
            modelYear: {
                model: { name: model, make: { name: make } },
                year: { value: year },
            },
            partType: { name: part },
        },
        include: {
            subParts: true,
            variants: true, // <-- include all variants for each product
            images: true,
            modelYear: {
                include: {
                    model: { include: { make: true } },
                    year: true,
                },
            },
            partType: true,
        },
    });
    // 1. Aggregate all unique subParts
    const allSubParts = [];
    const seenSubParts = new Set();
    for (const p of products) {
        for (const sp of p.subParts) {
            if (!seenSubParts.has(sp.id)) {
                allSubParts.push(sp);
                seenSubParts.add(sp.id);
            }
        }
    }
    // 2. Create a map to group variants by sub-part
    const variantsBySubPart = new Map();
    for (const p of products) {
        for (const v of p.variants) {
            for (const sp of p.subParts) {
                if (!variantsBySubPart.has(sp.id)) {
                    variantsBySubPart.set(sp.id, {
                        subPart: sp,
                        variants: [],
                    });
                }
                variantsBySubPart.get(sp.id).variants.push({
                    ...v,
                    product: {
                        id: p.id,
                        sku: p.sku,
                        // other product details...
                        images: p.images,
                        description: p.description,
                    },
                });
            }
        }
    }
    // 3. Return the response
    return {
        make,
        model,
        year,
        part,
        subParts: allSubParts,
        groupedVariants: Array.from(variantsBySubPart.values()),
    };
};
exports.getGroupedProductWithSubParts = getGroupedProductWithSubParts;
const getGroupedProductWithSubPartsV2 = async ({ make, model, year, part, }) => {
    const products = await prisma_1.prisma.product.findMany({
        where: {
            modelYear: {
                model: { name: model, make: { name: make } },
                year: { value: year },
            },
            partType: { name: part },
        },
        include: {
            subParts: true,
            variants: true, // <-- include all variants for each product
            images: true,
            modelYear: {
                include: {
                    model: { include: { make: true } },
                    year: true,
                },
            },
            partType: true,
        },
    });
    // 1. Aggregate all unique subParts
    const allSubParts = [];
    const seenSubParts = new Set();
    for (const p of products) {
        for (const sp of p.subParts) {
            if (!seenSubParts.has(sp.id)) {
                allSubParts.push(sp);
                seenSubParts.add(sp.id);
            }
        }
    }
    // 2. Create a map to group variants by sub-part
    const variantsBySubPart = new Map();
    for (const p of products) {
        for (const v of p.variants) {
            for (const sp of p.subParts) {
                if (!variantsBySubPart.has(sp.id)) {
                    variantsBySubPart.set(sp.id, {
                        subPart: sp,
                        variants: [],
                    });
                }
                variantsBySubPart.get(sp.id).variants.push({
                    ...v,
                    product: {
                        id: p.id,
                        sku: p.sku,
                        // other product details...
                        images: p.images,
                        description: p.description,
                    },
                });
            }
        }
    }
    // 3. Return the response
    return {
        make,
        model,
        year,
        part,
        subParts: allSubParts,
        groupedVariants: Array.from(variantsBySubPart.values()),
    };
};
exports.getGroupedProductWithSubPartsV2 = getGroupedProductWithSubPartsV2;
const getAllProducts = async (page = 1, limit = 50, filters) => {
    const skip = (page - 1) * limit;
    // Build where clause based on filters
    const where = {};
    if (filters?.make && filters.make !== "Select Make") {
        where.modelYear = {
            ...where.modelYear,
            model: {
                ...where.modelYear?.model,
                make: { name: filters.make },
            },
        };
    }
    if (filters?.model && filters.model !== "Select Model") {
        where.modelYear = {
            ...where.modelYear,
            model: {
                ...where.modelYear?.model,
                name: filters.model,
            },
        };
    }
    if (filters?.year && filters.year !== "Select Year") {
        where.modelYear = {
            ...where.modelYear,
            year: { value: filters.year },
        };
    }
    if (filters?.part && filters.part !== "Select Part") {
        where.partType = { name: filters.part };
    }
    // Tokenized, case-insensitive search across multiple fields with AND logic
    if (filters?.search && filters.search.trim() !== "") {
        const tokens = filters.search
            .split(/[\s,]+/)
            .map((t) => t.trim())
            .filter(Boolean);
        if (tokens.length === 1) {
            const term = tokens[0];
            where.OR = [
                { sku: { contains: term } },
                { description: { contains: term } },
                {
                    modelYear: {
                        model: { name: { contains: term } },
                    },
                },
                {
                    modelYear: {
                        model: { make: { name: { contains: term } } },
                    },
                },
                {
                    modelYear: {
                        year: { value: { contains: term } },
                    },
                },
                { partType: { name: { contains: term } } },
            ];
        }
        else if (tokens.length > 1) {
            where.AND = tokens.map((term) => ({
                OR: [
                    { sku: { contains: term } },
                    { description: { contains: term } },
                    {
                        modelYear: {
                            model: { name: { contains: term } },
                        },
                    },
                    {
                        modelYear: {
                            model: {
                                make: { name: { contains: term } },
                            },
                        },
                    },
                    {
                        modelYear: {
                            year: { value: { contains: term } },
                        },
                    },
                    { partType: { name: { contains: term } } },
                ],
            }));
        }
    }
    const [products, total] = await Promise.all([
        prisma_1.prisma.product.findMany({
            where,
            skip,
            take: limit,
            include: {
                modelYear: {
                    include: {
                        model: {
                            include: {
                                make: true,
                            },
                        },
                        year: true,
                    },
                },
                partType: true,
                subParts: true,
                variants: true,
                images: true,
            },
            orderBy: {
                id: "desc",
            },
        }),
        prisma_1.prisma.product.count({ where }),
    ]);
    return {
        products: products.map((p) => {
            // Build specification from variant specification or subparts
            let specification = "";
            if (p.variants.length > 0 && p.variants[0].specification) {
                specification = p.variants[0].specification;
            }
            else if (p.description) {
                specification = p.description;
            }
            else if (p.subParts.length > 0) {
                specification = p.subParts.map((sp) => sp.name).join(", ");
            }
            return {
                id: p.id,
                sku: p.sku,
                make: p.modelYear.model.make.name,
                model: p.modelYear.model.name,
                year: p.modelYear.year.value,
                part: p.partType.name,
                specification: specification,
                status: p.inStock ? "Instock" : "Outstock",
                amount: p.variants[0]?.actualprice || 0,
                images: p.images,
                subParts: p.subParts,
                variants: p.variants,
            };
        }),
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    };
};
exports.getAllProducts = getAllProducts;
const createListing = async (params) => {
    const makeName = params.make?.trim();
    const modelName = params.model?.trim();
    const yearValue = params.year?.trim();
    const partName = params.part?.trim();
    const specification = params.specification?.trim();
    if (!makeName || !modelName || !yearValue || !partName) {
        throw new Error("Missing required fields: make, model, year, part");
    }
    // Ensure base taxonomy exists
    const make = await prisma_1.prisma.make.upsert({
        where: { name: makeName },
        update: {},
        create: { name: makeName },
    });
    const model = await prisma_1.prisma.model.upsert({
        where: { name_makeId: { name: modelName, makeId: make.id } },
        update: {},
        create: { name: modelName, makeId: make.id },
    });
    const year = await prisma_1.prisma.year.upsert({
        where: { value: yearValue },
        update: {},
        create: { value: yearValue },
    });
    const modelYear = await prisma_1.prisma.modelYear.upsert({
        where: { modelId_yearId: { modelId: model.id, yearId: year.id } },
        update: {},
        create: { modelId: model.id, yearId: year.id },
    });
    const partType = await prisma_1.prisma.partType.upsert({
        where: { name: partName },
        update: {},
        create: { name: partName },
    });
    // Create or find the SubPart first if specification exists
    let targetSubPart = null;
    if (specification) {
        targetSubPart = await prisma_1.prisma.subPart.upsert({
            where: {
                name_partTypeId: { name: specification, partTypeId: partType.id },
            },
            update: {},
            create: { name: specification, partTypeId: partType.id },
        });
    }
    // Try to find an existing product for this EXACT combination
    // Each unique specification should create a SEPARATE product
    let product = null;
    if (specification && targetSubPart) {
        // Find products with same modelYear, partType
        const potentialProducts = await prisma_1.prisma.product.findMany({
            where: {
                modelYearId: modelYear.id,
                partTypeId: partType.id,
                subParts: {
                    some: { id: targetSubPart.id },
                },
            },
            include: {
                subParts: true,
                variants: true,
                images: true,
                modelYear: {
                    include: { model: { include: { make: true } }, year: true },
                },
                partType: true,
            },
        });
        // Only reuse if product has EXACTLY this one subPart and no others
        // This ensures each specification gets its own product
        product =
            potentialProducts.find((p) => p.subParts.length === 1 && p.subParts[0].id === targetSubPart.id) || null;
    }
    else {
        // No specification provided - find product with same modelYear and partType with NO subParts
        product = await prisma_1.prisma.product.findFirst({
            where: {
                modelYearId: modelYear.id,
                partTypeId: partType.id,
                subParts: {
                    none: {}, // No subParts
                },
            },
            include: {
                subParts: true,
                variants: true,
                images: true,
                modelYear: {
                    include: { model: { include: { make: true } }, year: true },
                },
                partType: true,
            },
        });
    }
    // Create new product if not found or specification differs
    if (!product) {
        const skuBase = `${makeName}-${modelName}-${yearValue}-${partName}`
            .toUpperCase()
            .replace(/\s+/g, "-");
        const sku = specification
            ? `${skuBase}-${specification}`.toUpperCase().replace(/\s+/g, "-")
            : `${skuBase}`;
        const createData = {
            sku,
            modelYearId: modelYear.id,
            partTypeId: partType.id,
            inStock: false,
            status: null,
        };
        // Connect subPart during product creation if specification exists
        if (specification && targetSubPart) {
            createData.subParts = {
                connect: { id: targetSubPart.id },
            };
        }
        product = await prisma_1.prisma.product.create({
            data: createData,
            include: {
                subParts: true,
                variants: true,
                images: true,
                modelYear: {
                    include: { model: { include: { make: true } }, year: true },
                },
                partType: true,
            },
        });
        // Create default variant for new product
        let productvariant_1 = await prisma_1.prisma.productVariant_1.create({
            data: {
                productId: product.id,
                sku: `${sku}-N/A`,
                heading1: createData.heading1 ?? null,
                heading2: createData.heading2 ?? null,
                category: createData.category ?? null,
                warranty: createData.warranty ?? null,
                miles: "N/A",
                actualprice: 0,
                discountedPrice: 0,
                inStock: false,
                product_img: null,
                description: null,
                title: null,
                specification: specification || null,
            },
        });
        console.log("productvariant_1:", productvariant_1);
    }
    return {
        id: product.id,
        sku: product.sku,
        make: product.modelYear.model.make.name,
        model: product.modelYear.model.name,
        year: product.modelYear.year.value,
        part: product.partType.name,
        specification: specification || "",
        status: product.inStock ? "Instock" : "Outstock",
        images: product.images,
        subParts: product.subParts,
        variants: product.variants,
    };
};
exports.createListing = createListing;
const deleteProduct = async (productId) => {
    // Check if product exists
    const product = await prisma_1.prisma.product.findUnique({
        where: { id: productId },
        include: {
            variants: true,
            orderItems: true,
        },
    });
    if (!product) {
        throw new Error("Product not found");
    }
    // Check if product has any order items (prevent deletion if it's been ordered)
    if (product.orderItems && product.orderItems.length > 0) {
        throw new Error("Cannot delete product that has been ordered. Please contact support.");
    }
    // Delete product variants first (due to foreign key constraints)
    if (product.variants && product.variants.length > 0) {
        await prisma_1.prisma.productVariant_1.deleteMany({
            where: { productId: productId },
        });
    }
    // Delete the product
    await prisma_1.prisma.product.delete({
        where: { id: productId },
    });
    return { success: true, message: "Product deleted successfully" };
};
exports.deleteProduct = deleteProduct;
const createVariant = async (productId, payload) => {
    const product = await prisma_1.prisma.product.findUnique({ where: { id: productId } });
    if (!product)
        throw new Error("Product not found");
    const sku = `${product.sku || "SKU"}-${payload.miles || "N/A"}`;
    const created = await prisma_1.prisma.productVariant_1.create({
        data: {
            productId,
            sku,
            heading1: payload.heading1 ?? null,
            heading2: payload.heading2 ?? null,
            category: payload.category ?? null,
            warranty: payload.warranty ?? null,
            miles: payload.miles ?? "N/A",
            actualprice: payload.actualprice ?? 0,
            discountedPrice: payload.discountedPrice ?? 0,
            inStock: payload.inStock ?? false,
            specification: payload.specification ?? null,
            title: payload.title ?? null,
            description: payload.description ?? null,
            product_img: null,
        },
    });
    // Update product stock to reflect variant
    await prisma_1.prisma.product.update({
        where: { id: productId },
        data: { inStock: Boolean(payload.inStock ?? false) },
    });
    return created;
};
exports.createVariant = createVariant;
const updateVariant = async (variantId, payload) => {
    // Ensure variant exists
    const existing = await prisma_1.prisma.productVariant_1.findUnique({
        where: { id: variantId },
        include: { product: true },
    });
    if (!existing)
        throw new Error("Variant not found");
    const updated = await prisma_1.prisma.productVariant_1.update({
        where: { id: variantId },
        data: {
            heading1: payload.heading1 ?? existing.heading1,
            heading2: payload.heading2 ?? existing.heading2,
            category: payload.category ?? existing.category,
            warranty: payload.warranty ?? existing.warranty,
            miles: payload.miles ?? existing.miles,
            actualprice: payload.actualprice !== undefined
                ? payload.actualprice
                : existing.actualprice,
            discountedPrice: payload.discountedPrice !== undefined
                ? payload.discountedPrice
                : existing.discountedPrice,
            inStock: payload.inStock !== undefined
                ? Boolean(payload.inStock)
                : existing.inStock,
            specification: payload.specification !== undefined
                ? payload.specification
                : existing.specification,
            title: payload.title !== undefined ? payload.title : existing.title,
            description: payload.description !== undefined
                ? payload.description
                : existing.description,
        },
    });
    // Optionally update product stock
    if (payload.inStock !== undefined && existing.product) {
        await prisma_1.prisma.product.update({
            where: { id: existing.productId },
            data: { inStock: Boolean(payload.inStock) },
        });
    }
    return updated;
};
exports.updateVariant = updateVariant;
const deleteVariant = async (variantId) => {
    const existing = await prisma_1.prisma.productVariant_1.findUnique({
        where: { id: variantId },
    });
    if (!existing)
        throw new Error("Variant not found");
    await prisma_1.prisma.productVariant_1.delete({ where: { id: variantId } });
    // If product has no variants left, mark product out of stock
    const remaining = await prisma_1.prisma.productVariant_1.count({
        where: { productId: existing.productId },
    });
    if (remaining === 0) {
        await prisma_1.prisma.product.update({
            where: { id: existing.productId },
            data: { inStock: false },
        });
    }
    return { success: true };
};
exports.deleteVariant = deleteVariant;
