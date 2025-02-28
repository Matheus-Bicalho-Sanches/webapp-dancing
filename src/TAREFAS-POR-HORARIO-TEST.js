/**
 * Script de teste para a funcionalidade de Tarefas Por Horário
 * 
 * Este script contém funções para testar as operações CRUD da
 * funcionalidade de tarefas por horário, incluindo:
 * - Criar uma nova tarefa por horário
 * - Editar uma tarefa existente
 * - Alterar o status de uma tarefa
 * - Excluir uma tarefa
 * - Recuperar tarefas por horário
 */

import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  serverTimestamp, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Cria uma nova tarefa por horário
 * @param {Object} userData - Dados do usuário atual
 * @param {Object} taskData - Dados da tarefa
 * @returns {Promise<Object>} - A tarefa criada
 */
export const createScheduledTask = async (userData, taskData) => {
  try {
    // Validações básicas
    if (!taskData.descricao) {
      throw new Error('A descrição da tarefa é obrigatória');
    }
    
    if (!taskData.diasDaSemana || !Array.isArray(taskData.diasDaSemana) || taskData.diasDaSemana.length === 0) {
      throw new Error('Selecione pelo menos um dia da semana');
    }
    
    if (!taskData.horario) {
      throw new Error('O horário da tarefa é obrigatório');
    }
    
    // Dados a serem salvos
    const taskToSave = {
      descricao: taskData.descricao,
      diasDaSemana: taskData.diasDaSemana,
      horario: taskData.horario,
      status: taskData.status || 'Pendente',
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
      criadoPor: {
        uid: userData.uid,
        email: userData.email,
        displayName: userData.displayName || userData.email
      },
      ultimaAtualizacaoPor: {
        uid: userData.uid,
        email: userData.email,
        displayName: userData.displayName || userData.email
      }
    };
    
    // Salvar no Firestore
    const docRef = await addDoc(collection(db, 'tarefas_por_horario'), taskToSave);
    
    // Retornar a tarefa criada com o ID
    return {
      id: docRef.id,
      ...taskToSave
    };
  } catch (error) {
    console.error('Erro ao criar tarefa por horário:', error);
    throw error;
  }
};

/**
 * Editar uma tarefa por horário existente
 * @param {Object} userData - Dados do usuário atual
 * @param {string} taskId - ID da tarefa a ser editada
 * @param {Object} taskData - Novos dados da tarefa
 * @returns {Promise<void>}
 */
export const updateScheduledTask = async (userData, taskId, taskData) => {
  try {
    // Validações básicas
    if (!taskData.descricao) {
      throw new Error('A descrição da tarefa é obrigatória');
    }
    
    if (!taskData.diasDaSemana || !Array.isArray(taskData.diasDaSemana) || taskData.diasDaSemana.length === 0) {
      throw new Error('Selecione pelo menos um dia da semana');
    }
    
    if (!taskData.horario) {
      throw new Error('O horário da tarefa é obrigatório');
    }
    
    // Dados a serem atualizados
    const updates = {
      descricao: taskData.descricao,
      diasDaSemana: taskData.diasDaSemana,
      horario: taskData.horario,
      status: taskData.status || 'Pendente',
      atualizadoEm: serverTimestamp(),
      ultimaAtualizacaoPor: {
        uid: userData.uid,
        email: userData.email,
        displayName: userData.displayName || userData.email
      }
    };
    
    // Atualizar no Firestore
    const taskRef = doc(db, 'tarefas_por_horario', taskId);
    await updateDoc(taskRef, updates);
  } catch (error) {
    console.error('Erro ao atualizar tarefa por horário:', error);
    throw error;
  }
};

/**
 * Alterar o status de uma tarefa por horário
 * @param {Object} userData - Dados do usuário atual
 * @param {string} taskId - ID da tarefa
 * @param {string} newStatus - Novo status da tarefa
 * @returns {Promise<void>}
 */
export const changeScheduledTaskStatus = async (userData, taskId, newStatus) => {
  try {
    // Validar status
    const validStatuses = ['Pendente', 'Em andamento', 'Finalizada', 'Aguardando', 'Urgente'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error('Status inválido');
    }
    
    // Dados a serem atualizados
    const updates = {
      status: newStatus,
      atualizadoEm: serverTimestamp(),
      ultimaAtualizacaoPor: {
        uid: userData.uid,
        email: userData.email,
        displayName: userData.displayName || userData.email
      }
    };
    
    // Atualizar no Firestore
    const taskRef = doc(db, 'tarefas_por_horario', taskId);
    await updateDoc(taskRef, updates);
  } catch (error) {
    console.error('Erro ao alterar status da tarefa por horário:', error);
    throw error;
  }
};

/**
 * Excluir uma tarefa por horário
 * @param {string} taskId - ID da tarefa a ser excluída
 * @returns {Promise<void>}
 */
export const deleteScheduledTask = async (taskId) => {
  try {
    const taskRef = doc(db, 'tarefas_por_horario', taskId);
    await deleteDoc(taskRef);
  } catch (error) {
    console.error('Erro ao excluir tarefa por horário:', error);
    throw error;
  }
};

/**
 * Obter todas as tarefas por horário ordenadas por descrição
 * @returns {Promise<Array>} - Lista de tarefas
 */
export const getScheduledTasks = async () => {
  try {
    const q = query(
      collection(db, 'tarefas_por_horario'),
      orderBy('descricao')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Erro ao obter tarefas por horário:', error);
    throw error;
  }
};

/**
 * Exemplo de uso das funções:
 * 
 * import { 
 *   createScheduledTask, 
 *   updateScheduledTask, 
 *   changeScheduledTaskStatus, 
 *   deleteScheduledTask, 
 *   getScheduledTasks 
 * } from './TAREFAS-POR-HORARIO-TEST';
 * 
 * // Criar tarefa
 * const userData = {
 *   uid: 'user123',
 *   email: 'usuario@exemplo.com',
 *   displayName: 'João Silva'
 * };
 * 
 * const taskData = {
 *   descricao: 'Reunião de planejamento',
 *   diasDaSemana: ['Segunda', 'Quarta', 'Sexta'],
 *   horario: '14:30',
 *   status: 'Pendente'
 * };
 * 
 * createScheduledTask(userData, taskData)
 *   .then(task => console.log('Tarefa criada:', task))
 *   .catch(error => console.error(error));
 * 
 * // Obter todas as tarefas
 * getScheduledTasks()
 *   .then(tasks => console.log('Tarefas:', tasks))
 *   .catch(error => console.error(error));
 */ 