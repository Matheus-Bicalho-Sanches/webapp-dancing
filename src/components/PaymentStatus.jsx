import React, { useState, useEffect } from 'react';
import './PaymentStatus.css';

const PaymentStatus = ({ orderId, onPaymentCompleted, onPaymentRetry }) => {
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const checkPaymentStatus = async () => {
    try {
      const response = await fetch(`/api/pagbank/payment-status/${orderId}`);
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.status);
        
        if (data.status === 'PAID' || data.status === 'DECLINED' || data.status === 'CANCELLED') {
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    }
  };

  useEffect(() => {
    const interval = setInterval(checkPaymentStatus, 3000);
    
    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, [orderId]);

  return (
    <div className="payment-status">
      {isLoading && (
        <div className="status-container">
          <div className="spinner"></div>
          <h3>Aguardando pagamento...</h3>
          <p>Por favor, complete o pagamento usando o QR Code</p>
        </div>
      )}

      {status === 'PAID' && (
        <div className="status-container success">
          <i className="fas fa-check-circle"></i>
          <h3>Pagamento Confirmado!</h3>
          <p>Sua aula foi agendada com sucesso</p>
          <button onClick={onPaymentCompleted} className="continue-btn">
            Continuar
          </button>
        </div>
      )}

      {(status === 'DECLINED' || status === 'CANCELLED') && (
        <div className="status-container error">
          <i className="fas fa-times-circle"></i>
          <h3>Pagamento não realizado</h3>
          <p>Houve um problema com seu pagamento</p>
          <button onClick={onPaymentRetry} className="retry-btn">
            Tentar Novamente
          </button>
        </div>
      )}
    </div>
  );
};

export default PaymentStatus; 