export const getAvailableQuantity = (quantity: unknown): number | undefined => {
    if (quantity === undefined || quantity === null) return undefined;
    if (typeof quantity === 'string' && quantity.trim().length === 0) return undefined;

    const value = typeof quantity === 'number' ? quantity : Number(quantity);
    return Number.isFinite(value) ? value : undefined;
};

export const isOutOfStockQuantity = (quantity: unknown): boolean => {
    const availableQuantity = getAvailableQuantity(quantity);
    return availableQuantity !== undefined && availableQuantity <= 0;
};

export const requiresSellerContact = (product: { category?: unknown }): boolean => {
    const category = product.category;
    return Boolean(
        category &&
        typeof category === 'object' &&
        (category as any).transactionMode === 'contact',
    );
};
