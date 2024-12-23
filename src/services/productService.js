import { db } from '../config/firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  getDoc 
} from 'firebase/firestore';

export const productService = {
  async getProducts() {
    const productsRef = collection(db, 'products');
    const snapshot = await getDocs(productsRef);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  },

  async updateProductStock(productId, newStock) {
    const productRef = doc(db, 'products', productId);
    const productDoc = await getDoc(productRef);
    
    if (!productDoc.exists()) {
      throw new Error('Produto não encontrado');
    }

    if (newStock < 0) {
      throw new Error('Estoque não pode ser negativo');
    }

    await updateDoc(productRef, { stock: newStock });
    return {
      id: productId,
      ...productDoc.data(),
      stock: newStock
    };
  }
}; 