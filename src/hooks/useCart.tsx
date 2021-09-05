import { AxiosError, AxiosResponse } from 'axios';
import { totalmem } from 'os';
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
      const updatedCart = [...cart];
      const productExists = updatedCart.find(product => product.id === productId);
      const stock = await api.get(`stock/${productId}`);
      const stockAmount = stock.data.amount;
      const currentAmount = productExists ? productExists.amount: 0;
      const amount = currentAmount + 1;

      if(amount > stockAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }
      if(productExists) {
        productExists.amount = amount;
      } else {
          const product = await api.get(`/products/${productId}`);
          const newProduct = {...product.data, amount: 1}
          updatedCart.push(newProduct);
      }
      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
    } catch (error) {
     toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productFound = cart.find(
        product => product.id === productId
      );

      if (!productFound) {
        throw new Error('Erro na remoção do produto');
      }

      const products = cart.filter(product => product.id !== productId);
      setCart([...products]);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(products));
    } catch (error) {
      toast.error(error.message);
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const quantityProducts: Stock = await api.get(`stock/${productId}`)
        .then((response: AxiosResponse) => {
          return response.data;
        })
        .catch((reason: AxiosError) => {
          if (reason.response!.status === 404) {
            throw new Error('Erro na alteração de quantidade do produto');
          }
        });

      if (!quantityProducts) {
        throw new Error('Erro na alteração de quantidade do produto');
      }

      const productFound = cart.find(
        product => product.id === productId
      );

      if (!productFound) {
        throw new Error('Erro na alteração de quantidade do produto');
      }

      if (amount < 1) {
        throw new Error('Erro na alteração de quantidade do produto');
      }

      if(amount > quantityProducts.amount) {
        throw new Error('Quantidade solicitada fora de estoque');
      }

      productFound.amount = amount;
      setCart(cart => [...cart]);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    } catch (error) {
      toast.error(error.message);
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
