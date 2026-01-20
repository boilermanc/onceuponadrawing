
export enum AppStep {
  INITIAL = 'INITIAL',
  AUTH = 'AUTH',
  AUTH_SUCCESS = 'AUTH_SUCCESS',
  PROFILE = 'PROFILE',
  UPLOAD = 'UPLOAD',
  ANALYZING = 'ANALYZING',
  REFINING = 'REFINING',
  ANIMATING = 'ANIMATING',
  RESULT = 'RESULT',
  PRODUCT_SELECT = 'PRODUCT_SELECT',
  CHECKOUT = 'CHECKOUT',
  CONFIRMATION = 'CONFIRMATION'
}

export enum ProductType {
  EBOOK = 'EBOOK',
  HARDCOVER = 'HARDCOVER'
}

export enum OrderStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  GENERATING_PDF = 'GENERATING_PDF',
  PDF_READY = 'PDF_READY',
  SUBMITTED_TO_PRINTER = 'SUBMITTED_TO_PRINTER',
  IN_PRODUCTION = 'IN_PRODUCTION',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  ERROR = 'ERROR'
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  subscribed: boolean;
  createdAt: string;
}

export interface StoryPage {
  pageNumber: number;
  text: string;
  imagePrompt: string;
  imageUrl?: string;
}

export interface DrawingAnalysis {
  subject: string;
  characterAppearance: string;
  environment: string;
  suggestedAction: string;
  storyTitle: string;
  pages: StoryPage[];
  artistName: string;
  year: string;
  grade: string;
  age: string;
  dedication?: string;
  aboutArtist?: string;
  artistPhotoUrl?: string;
}

export interface ShippingInfo {
  fullName: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email?: string;
}

export interface Order {
  id: string;
  createdAt: string;
  customerEmail: string;
  productType: ProductType;
  totalAmount: number;
  status: OrderStatus;
  trackingNumber?: string;
  trackingUrl?: string;
}

export interface AppState {
  step: AppStep;
  user: User | null;
  originalImage: string | null;
  originalImageUrl?: string;
  analysis: DrawingAnalysis | null;
  finalVideoUrl: string | null;
  heroImageUrl?: string;
  error: string | null;
  currentOrder?: Order;
}
