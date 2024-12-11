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
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Buscar informações adicionais do usuário no Firestore
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('uid', '==', userCredential.user.uid));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        // Atualizar o currentUser com as informações do Firestore
        setCurrentUser({
          ...userCredential.user,
          ...userData,
          id: querySnapshot.docs[0].id
        });
      }

      return userCredential;
    } catch (error) {
      throw error;
    }
  }

  function logout() {
    setCurrentUser(null);
    return signOut(auth);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Buscar informações adicionais do usuário no Firestore
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('uid', '==', user.uid));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            // Atualizar o currentUser com as informações do Firestore
            setCurrentUser({
              ...user,
              ...userData,
              id: querySnapshot.docs[0].id
            });
          } else {
            setCurrentUser(user);
          }
        } catch (error) {
          console.error('Erro ao buscar dados do usuário:', error);
          setCurrentUser(user);
        }
      } else {
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