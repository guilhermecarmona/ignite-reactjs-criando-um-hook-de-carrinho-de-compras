import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const { data: stockData } = await api.get<Stock>(`/stock/${productId}`);
      const stockAmount = stockData.amount;
      const newCart = [...cart];
      const findProductIdx = cart.findIndex(
        product => product.id === productId
      );
      if (findProductIdx > -1) {
        const amount = cart[findProductIdx].amount + 1;
        if (stockAmount < amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }
        newCart.splice(findProductIdx, 1, {
          ...cart[findProductIdx],
          amount,
        });
      } else {
        const amount = 1;
        if (stockAmount < 1) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }
        const { data: product } = await api.get(`/products/${productId}`);
        newCart.push({ ...product, amount });
      }
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      setCart(newCart);
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const findProductIdx = cart.findIndex(
        product => product.id === productId
      );
      if (findProductIdx > -1) {
        const newCart = [...cart];
        newCart.splice(findProductIdx, 1);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
        setCart(newCart);
        return;
      }
      throw Error();
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const { data: stockData } = await api.get<Stock>(`/stock/${productId}`);
      const stockAmount = stockData.amount;

      if (stockAmount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const findProductIdx = cart.findIndex(
        product => product.id === productId
      );

      if (findProductIdx > -1) {
        const newCart = [...cart];
        newCart.splice(findProductIdx, 1, {
          ...cart[findProductIdx],
          amount,
        });
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
        setCart(newCart);
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
