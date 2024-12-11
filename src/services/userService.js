import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where 
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, 
  deleteUser as deleteAuthUser,
  signInWithEmailAndPassword,
  updatePassword
} from 'firebase/auth';
import { auth, db } from '../config/firebase';

// Coleção de usuários no Firestore
const USERS_COLLECTION = 'users';

// Função para listar todos os usuários
export const listUsers = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, USERS_COLLECTION));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    throw error;
  }
};

// Função para criar um novo usuário
export const createUser = async (userData) => {
  try {
    // 1. Criar usuário no Authentication
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      userData.email,
      userData.password
    );

    // 2. Criar documento do usuário no Firestore
    const userDoc = await addDoc(collection(db, USERS_COLLECTION), {
      uid: userCredential.user.uid,
      name: userData.name,
      email: userData.email,
      whatsapp: userData.whatsapp,
      userType: userData.userType,
      firstAccess: true,
      createdAt: new Date().toISOString()
    });

    return {
      id: userDoc.id,
      uid: userCredential.user.uid,
      ...userData
    };
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    throw error;
  }
};

// Função para atualizar um usuário
export const updateUser = async (userId, userData) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    
    // Dados a serem atualizados
    const updateData = {
      name: userData.name,
      whatsapp: userData.whatsapp,
      userType: userData.userType,
      updatedAt: new Date().toISOString()
    };

    // Se uma nova senha foi fornecida, atualizar no Authentication
    if (userData.password) {
      // Primeiro, precisamos fazer login como o usuário para atualizar a senha
      const userDoc = await getDocs(query(
        collection(db, USERS_COLLECTION),
        where('id', '==', userId)
      ));
      
      if (!userDoc.empty) {
        const user = userDoc.docs[0].data();
        await signInWithEmailAndPassword(auth, user.email, userData.currentPassword);
        await updatePassword(auth.currentUser, userData.password);
      }
    }

    // Atualizar dados no Firestore
    await updateDoc(userRef, updateData);

    return {
      id: userId,
      ...updateData
    };
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    throw error;
  }
};

// Função para excluir um usuário
export const deleteUser = async (userId) => {
  try {
    // 1. Obter o documento do usuário
    const userDoc = await getDocs(query(
      collection(db, USERS_COLLECTION),
      where('id', '==', userId)
    ));

    if (!userDoc.empty) {
      const user = userDoc.docs[0].data();
      
      // 2. Excluir usuário do Authentication
      if (user.uid) {
        await deleteAuthUser(auth.currentUser);
      }

      // 3. Excluir documento do Firestore
      await deleteDoc(doc(db, USERS_COLLECTION, userId));
    }

    return true;
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    throw error;
  }
};

// Função para verificar se é o primeiro acesso
export const checkFirstAccess = async (userId) => {
  try {
    const userDoc = await getDocs(query(
      collection(db, USERS_COLLECTION),
      where('id', '==', userId)
    ));

    if (!userDoc.empty) {
      return userDoc.docs[0].data().firstAccess || false;
    }

    return false;
  } catch (error) {
    console.error('Erro ao verificar primeiro acesso:', error);
    throw error;
  }
};

// Função para marcar que não é mais o primeiro acesso
export const markFirstAccessComplete = async (userId) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, {
      firstAccess: false,
      firstAccessDate: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao marcar primeiro acesso como completo:', error);
    throw error;
  }
}; 