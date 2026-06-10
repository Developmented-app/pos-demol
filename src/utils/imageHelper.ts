import { Product } from '../types';

/**
 * Returns the image URL for a given product.
 * If the product has a user-defined imageUrl, it returns that.
 * Otherwise, it uses a deterministic seeding strategy to select a highly-themed
 * placeholder image representing the category and product name from Picsum Photos.
 */
export function getProductImageUrl(product: Product): string {
  if (product.imageUrl && product.imageUrl.trim() !== '') {
    return product.imageUrl;
  }

  // Set up category-specific thematic search keywords to make seeds more relevant
  let categoryKeyword = 'coffee';
  const cat = product.category?.toLowerCase() || '';
  if (cat.includes('bev') || cat.includes('drink')) {
    categoryKeyword = 'cold-beverage-ice-tea';
  } else if (cat.includes('food') || cat.includes('kitchen')) {
    categoryKeyword = 'croissant-toast';
  } else if (cat.includes('dessert') || cat.includes('bake')) {
    categoryKeyword = 'cookie-muffin-cake';
  } else if (cat.includes('merch') || cat.includes('bean')) {
    categoryKeyword = 'coffee-bag-mug';
  }

  const cleanName = product.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  // Use Picsum Photos with a deterministic seed for high resolution aesthetic café vibes
  return `https://picsum.photos/seed/${categoryKeyword}-${cleanName}/300/225`;
}
