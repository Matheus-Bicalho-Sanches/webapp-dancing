import { db } from '../config/firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  getDoc,
  query,
  orderBy
} from 'firebase/firestore';

export const productService = {
  async getProducts() {
    console.log('Iniciando getProducts...');
    try {
      // Criar query ordenada por nome
      const productsRef = collection(db, 'produtos');
      const q = query(productsRef, orderBy('nome'));
      console.log('Buscando produtos na coleção "produtos" ordenados por nome');
      
      const snapshot = await getDocs(q);
      console.log('Total de documentos encontrados:', snapshot.size);
      
      if (snapshot.empty) {
        console.log('Nenhum produto encontrado na coleção');
        return [];
      }
      
      const products = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Processando produto:', {
          id: doc.id,
          nome: data.nome,
          valorVenda: data.valorVenda,
          estoque: data.estoque
        });
        
        if (!data.nome || !data.valorVenda || data.estoque === undefined) {
          console.warn('Produto com dados incompletos:', doc.id, data);
        }
        
        return {
          id: doc.id,
          name: data.nome || 'Sem nome',
          price: Number(data.valorVenda) || 0,
          stock: Number(data.estoque) || 0
        };
      });
      
      console.log('Produtos processados:', products);
      return products;
    } catch (error) {
      console.error('Erro em getProducts:', error);
      console.error('Stack trace:', error.stack);
      throw error;
    }
  },

  async updateProductStock(productId, newStock) {
    console.log('Atualizando estoque do produto:', productId, 'Novo estoque:', newStock);
    try {
      const productRef = doc(db, 'produtos', productId);
      const productDoc = await getDoc(productRef);
      
      if (!productDoc.exists()) {
        throw new Error('Produto não encontrado');
      }

      if (newStock < 0) {
        throw new Error('Estoque não pode ser negativo');
      }

      await updateDoc(productRef, { estoque: newStock });
      const updatedData = {
        id: productId,
        name: productDoc.data().nome,
        price: productDoc.data().valorVenda,
        stock: newStock
      };
      console.log('Produto atualizado:', updatedData);
      return updatedData;
    } catch (error) {
      console.error('Erro em updateProductStock:', error);
      throw error;
    }
  }
}; 