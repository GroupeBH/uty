export interface CategoryAttribute {
    name: string;
    type: string;
    options?: string[];
    required: boolean;
}

export interface Subcategory {
    _id: string;
    name: string;
    description: string;
    category: string | Category;
    isActive: boolean;
    attributes?: CategoryAttribute[];
    createdAt: string;
    updatedAt: string;
}

export interface Category {
    _id: string;
    name: string;
    description: string;
    icon: string;
    isActive: boolean;
    parentId?: string;
    ancestors?: string[];
    isLeaf: boolean;
    attributes?: CategoryAttribute[];
    createdAt: string;
    updatedAt: string;
}
