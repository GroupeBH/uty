export interface Currency {
    _id: string;
    code: string;
    name: string;
    symbol: string;
    isActive: boolean;
    exchangeRate: number;
    createdAt: string;
    updatedAt: string;
}
