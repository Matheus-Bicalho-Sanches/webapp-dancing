import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  setDoc, 
  getDoc 
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

    // 2. Criar documento do usuário no Firestore usando o UID como ID do documento
    const userDocRef = doc(db, USERS_COLLECTION, userCredential.user.uid);
    await setDoc(userDocRef, {
      uid: userCredential.user.uid,
      name: userData.name,
      email: userData.email,
      whatsapp: userData.whatsapp,
      userType: userData.userType,
      firstAccess: true,
      createdAt: new Date().toISOString()
    });

    return {
      id: userCredential.user.uid,
      uid: userCredential.user.uid,
      ...userData
    };
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    // Se der erro, tentar limpar o usuário do Authentication
    if (error.code === 'permission-denied') {
      console.error('Erro de permissão no Firestore. Verificando permissões do usuário...');
      const currentUserType = await checkCurrentUserType(auth.currentUser?.uid);
      console.log('Tipo do usuário atual:', currentUserType);
    }
    throw error;
  }
};

// Função para atualizar um usuário
export const updateUser = async (userId, userData) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    
    // Obter os dados atuais do usuário
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('Usuário não encontrado');
    }
    
    const user = userDoc.data();
    
    // Dados a serem atualizados
    const updateData = {
      name: userData.name,
      whatsapp: userData.whatsapp,
      userType: userData.userType,
      updatedAt: new Date().toISOString()
    };

    // Se uma nova senha foi fornecida, atualizar no Authentication
    if (userData.password && userData.password.trim() !== '') {
      console.log('Tentando atualizar senha do usuário:', userId);
      
      try {
        // Usar a API de redefinição de senha do Firebase Admin
        // Ou, se não estiver usando o Admin SDK, fazer o usuário logar novamente
        // e depois atualizar a senha
        
        // Se o usuário logado for o mesmo que está sendo editado
        if (auth.currentUser && auth.currentUser.uid === userId) {
          console.log('Atualizando senha do usuário atual');
          await updatePassword(auth.currentUser, userData.password);
        } else {
          // Se está atualizando outro usuário, use o método apropriado para administradores
          // Neste caso, precisamos usar o Firebase Admin SDK em uma função do Cloud Functions
          // ou enviar um email de redefinição de senha
          console.log('Precisa implementar a atualização de senha via Admin SDK ou outro método');
          
          // Temporariamente, vamos registrar que a senha não foi atualizada
          throw new Error('A atualização de senha de outros usuários requer implementação adicional');
        }
        
        console.log('Senha atualizada com sucesso no Firebase Authentication');
      } catch (authError) {
        console.error('Erro ao atualizar senha no Authentication:', authError);
        throw new Error(`Erro ao atualizar senha: ${authError.message}`);
      }
    }

    // Atualizar dados no Firestore
    await updateDoc(userRef, updateData);
    console.log('Dados do usuário atualizados no Firestore com sucesso');

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
    console.log('Iniciando exclusão do usuário:', userId);

    // 1. Obter o documento do usuário
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      throw new Error('Usuário não encontrado');
    }

    const userData = userDoc.data();
    console.log('Dados do usuário encontrados:', userData);

    // 2. Se o usuário tiver um UID do Authentication, tentar excluí-lo
    if (userData.uid) {
      try {
        // Primeiro, precisamos obter uma referência ao usuário no Authentication
        const userAuth = await getAuth().getUser(userData.uid);
        if (userAuth) {
          await getAuth().deleteUser(userData.uid);
          console.log('Usuário excluído do Authentication');
        }
      } catch (authError) {
        console.error('Erro ao excluir usuário do Authentication:', authError);
        // Continuar mesmo se falhar no Authentication, para garantir a limpeza do Firestore
      }
    }

    // 3. Excluir documento do Firestore
    await deleteDoc(userDocRef);
    console.log('Documento excluído do Firestore');

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

// Função para verificar o tipo do usuário atual
export const checkCurrentUserType = async (uid) => {
  try {
    if (!uid) {
      console.log('UID não fornecido');
      return null;
    }

    // Buscar documento diretamente pelo ID (que é o mesmo que o UID)
    const userDocRef = doc(db, USERS_COLLECTION, uid);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log('Tipo do usuário atual:', userData.userType);
      return userData.userType;
    }
    
    console.log('Usuário não encontrado na coleção users');
    return null;
  } catch (error) {
    console.error('Erro ao verificar tipo do usuário:', error);
    throw error;
  }
};

// Função para definir um usuário como master
export const setUserAsMaster = async (uid) => {
  try {
    if (!uid) {
      throw new Error('UID não fornecido');
    }

    // Atualizar documento diretamente pelo ID
    const userDocRef = doc(db, USERS_COLLECTION, uid);
    await setDoc(userDocRef, {
      userType: 'master'
    }, { merge: true }); // merge: true permite atualizar apenas o campo específico

    console.log('Usuário definido como master com sucesso');
    return true;
  } catch (error) {
    console.error('Erro ao definir usuário como master:', error);
    throw error;
  }
};

// Função para atualizar dados básicos do usuário
export const updateUserBasicInfo = async (uid, userData) => {
  try {
    if (!uid) {
      throw new Error('UID não fornecido');
    }

    const userDocRef = doc(db, USERS_COLLECTION, uid);
    await setDoc(userDocRef, {
      name: userData.name,
      email: userData.email,
      whatsapp: userData.whatsapp,
      updatedAt: new Date().toISOString()
    }, { merge: true }); // merge: true mantém os outros campos existentes

    console.log('Dados do usuário atualizados com sucesso');
    return true;
  } catch (error) {
    console.error('Erro ao atualizar dados do usuário:', error);
    throw error;
  }
}; 