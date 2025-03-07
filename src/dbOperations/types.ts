export interface User {
  id: string;          // UUID
  username: string;
  balance: number;
  created_at: Date;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface UserWithBalance {
  username: string;
  balance: number;
}

export interface PurchasedProduct {
  id: string;
  name: string;
  price: number;
  purchase_date: Date;
}

export interface UserSession {
  userId?: number;
}