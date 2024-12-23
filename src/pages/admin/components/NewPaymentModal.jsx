import React, { useState, useEffect } from 'react';
import { productService } from '../../../services/productService';

function NewPaymentModal({ onConfirm, onCancel }) {
  const [description, setDescription] = useState('');
  const [paymentType, setPaymentType] = useState('');
  const [value, setValue] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (paymentType === 'Cantina') {
      loadProducts();
    }
  }, [paymentType]);

  const loadProducts = async () => {
    try {
      const productsData = await productService.getProducts();
      setProducts(productsData);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    }
  };

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setValue(product.price * quantity);
    setDescription(`${product.name} (${quantity} unidade${quantity > 1 ? 's' : ''})`);
  };

  const handleConfirm = async () => {
    if (selectedProduct) {
      try {
        const newStock = selectedProduct.stock - quantity;
        
        if (newStock < 0) {
          alert('Quantidade maior que o estoque disponível!');
          return;
        }

        await productService.updateProductStock(
          selectedProduct.id, 
          newStock
        );

        onConfirm({
          description,
          paymentType,
          value,
          dueDate,
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          quantity,
          createdAt: new Date(),
          status: 'pendente'
        });
      } catch (error) {
        console.error('Erro ao atualizar estoque:', error);
        alert('Erro ao processar venda. Por favor, tente novamente.');
        return;
      }
    } else {
      onConfirm({
        description,
        paymentType,
        value,
        dueDate,
        createdAt: new Date(),
        status: 'pendente'
      });
    }
  };

  return (
    <div className="modal">
      <h2>Novo Pagamento</h2>
      
      <div className="form-group">
        <label>Tipo de Pagamento *</label>
        <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)}>
          <option value="">Selecione...</option>
          <option value="Mensalidade">Mensalidade</option>
          <option value="Cantina">Cantina</option>
          <option value="Outros">Outros</option>
        </select>
      </div>

      {paymentType === 'Cantina' && (
        <>
          <div className="form-group">
            <label>Produto *</label>
            <select 
              value={selectedProduct?.id || ''} 
              onChange={(e) => {
                const product = products.find(p => p.id === e.target.value);
                handleProductSelect(product);
              }}
            >
              <option value="">Selecione um produto...</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name} - R$ {product.price} (Estoque: {product.stock})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Quantidade *</label>
            <input
              type="number"
              min="1"
              max={selectedProduct?.stock || 1}
              value={quantity}
              onChange={(e) => {
                setQuantity(Number(e.target.value));
                if (selectedProduct) {
                  setValue(selectedProduct.price * Number(e.target.value));
                  setDescription(`${selectedProduct.name} (${e.target.value} unidade${e.target.value > 1 ? 's' : ''})`);
                }
              }}
            />
          </div>
        </>
      )}

      <div className="form-group">
        <label>Descrição *</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={paymentType === 'Cantina'}
        />
      </div>

      <div className="form-group">
        <label>Valor *</label>
        <input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={paymentType === 'Cantina'}
        />
      </div>

      <div className="form-group">
        <label>Data de Vencimento *</label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>

      <div className="modal-actions">
        <button onClick={onCancel}>Cancelar</button>
        <button onClick={handleConfirm}>Confirmar</button>
      </div>
    </div>
  );
}

export default NewPaymentModal; 