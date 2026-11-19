export interface Product {
  id: number;
  title: string;
  description: string | null;
  category: string | null;
  price: number;
  stock: number;
  indexed?: boolean;
  score?: number;
}

export interface CatalogPage {
  count: number;
  page: number;
  page_size: number;
  has_next: boolean;
  results: Product[];
}

export interface SearchResponse {
  query: string;
  count: number;
  results: Product[];
}

export interface RecommendationsResponse {
  product_id: number;
  count: number;
  results: Product[];
}

export type UserRole = "admin" | "customer";

export interface SessionUser {
  username: string;
  role: UserRole;
}

export interface LoginResponse {
  token: string;
  username: string;
  role: UserRole;
  expires_in: number;
}

export interface ApiError {
  detail: string;
}

export interface CartItem {
  productId: number;
  title: string;
  price: number;
  quantity: number;
}

export interface OrderItem {
  product_id: number;
  title: string;
  quantity: number;
  unit_price: number;
}

export interface Order {
  id: number;
  status: string;
  total: number;
  created_at: string;
  items: OrderItem[];
}

export interface OrdersResponse {
  count: number;
  results: Order[];
}
