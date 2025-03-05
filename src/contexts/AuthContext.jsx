import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../config/firebase';
import { 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function login(email, password) {
    try {
      console.log('Tentando fazer login:', email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Buscar informações adicionais do usuário no Firestore
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      const userDoc = await getDoc(userDocRef);
      
      let updatedUser = { ...userCredential.user };
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('Dados do usuário encontrados:', userData);
        // Atualizar o currentUser com as informações do Firestore
        updatedUser = {
          ...userCredential.user,
          ...userData,
          id: userDoc.id
        };
        console.log('Usuário atualizado:', updatedUser);
        setCurrentUser(updatedUser);
      } else {
        console.log('Documento do usuário não encontrado no Firestore');
      }

      return updatedUser;
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  }

  function logout() {
    console.log('Fazendo logout');
    setCurrentUser(null);
    return signOut(auth);
  }

  useEffect(() => {
    console.log('Configurando listener de auth state');
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user);
      if (user) {
        try {
          // Buscar informações adicionais do usuário no Firestore
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log('Dados do usuário encontrados:', userData);
            // Atualizar o currentUser com as informações do Firestore
            setCurrentUser({
              ...user,
              ...userData,
              id: userDoc.id
            });
          } else {
            console.log('Documento do usuário não encontrado no Firestore');
            setCurrentUser(user);
          }
        } catch (error) {
          console.error('Erro ao buscar dados do usuário:', error);
          setCurrentUser(user);
        }
      } else {
        console.log('Nenhum usuário autenticado');
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 