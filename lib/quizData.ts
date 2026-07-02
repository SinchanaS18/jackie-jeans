export const BRANDS = [
  "Levi's", "Wrangler", "Lee", "Zara", "H&M", "Gap", "Uniqlo",
  "Mango", "Calvin Klein", "Tommy Hilfiger", "Guess", "Pepe Jeans",
  "Diesel", "7 For All Mankind", "AG Jeans", "Citizens of Humanity",
  "Frame", "Acne Studios", "Nudie Jeans", "Everlane"
];

export const HEIGHTS = [
  "4'10\"", "4'11\"", "5'0\"", "5'1\"", "5'2\"", "5'3\"", "5'4\"",
  "5'5\"", "5'6\"", "5'7\"", "5'8\"", "5'9\"", "5'10\"", "5'11\"",
  "6'0\"", "6'1\"", "6'2\""
];

export const WAISTS = Array.from({ length: 29 }, (_, i) => `${i + 24}"`);
export const HIPS = Array.from({ length: 29 }, (_, i) => `${i + 32}"`);

export type FitProfile = {
  height?: string;
  weight?: string;
  waist?: string;
  hip?: string;
  waistFit?: string;
  rise?: string;
  thighFit?: string;
  brands?: string[];
  brandSizes?: Record<string, string>;
  frustration?: string;
};

export const WAIST_FIT_OPTIONS = ["Snug", "Slightly relaxed", "Relaxed"];
export const RISE_OPTIONS = ["High rise", "Mid rise", "Low rise"];
export const THIGH_OPTIONS = ["Fitted", "Relaxed", "Loose"];
export const FRUSTRATION_OPTIONS = [
  "Waist gap", "Hip tightness", "Wrong length", "Thigh fit", "Rise", "Other"
];

export const JEAN_SIZES = [
  "23", "24", "25", "26", "27", "28", "29", "30",
  "31", "32", "33", "34", "36", "38", "40",
  "XS", "S", "M", "L", "XL", "XXL"
];
