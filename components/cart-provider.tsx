"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { Cart, CartItem, CartContextType } from "@/lib/types/cart"

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>({
    items: [],
    total: 0,
    itemCount: 0
  })
  const [isCartOpen, setIsCartOpen] = useState(false)

  useEffect(() => {
    const savedCart = localStorage.getItem("gym-cart")
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart)
        setCart(parsed)
      } catch (error) {
        console.error("Error loading cart from localStorage:", error)
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem("gym-cart", JSON.stringify(cart))
  }, [cart])

  const calculateTotals = (items: CartItem[]) => {
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const itemCount = items.reduce((count, item) => count + item.quantity, 0)
    return { total, itemCount }
  }

  const addToCart = (product: { id?: string; product_id: string; name: string; price: number; stock?: number | string; brand?: string; category?: string }, quantity: number = 1) => {
    setCart(prevCart => {
      const existingItem = prevCart.items.find(item => item.product_id === product.product_id)
      
      const stockNum = typeof product.stock === 'string' ? parseInt(product.stock) || 999 : (product.stock || 999)
      
      let newItems: CartItem[]
      if (existingItem) {
        const newQuantity = Math.min(existingItem.quantity + quantity, stockNum)
        newItems = prevCart.items.map(item =>
          item.product_id === product.product_id
            ? { ...item, quantity: newQuantity }
            : item
        )
      } else {
        const newItem: CartItem = {
          id: product.id || product.product_id,
          product_id: product.product_id,
          name: product.name,
          price: product.price,
          quantity: Math.min(quantity, stockNum),
          brand: product.brand,
          category: product.category,
          max_stock: stockNum
        }
        newItems = [...prevCart.items, newItem]
      }
      
      const { total, itemCount } = calculateTotals(newItems)
      return { items: newItems, total, itemCount }
    })
    setIsCartOpen(true)
  }

  const removeFromCart = (productId: string) => {
    setCart(prevCart => {
      const newItems = prevCart.items.filter(item => item.product_id !== productId)
      const { total, itemCount } = calculateTotals(newItems)
      return { items: newItems, total, itemCount }
    })
  }

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }
    
    setCart(prevCart => {
      const newItems = prevCart.items.map(item =>
        item.product_id === productId
          ? { ...item, quantity: Math.min(quantity, item.max_stock) }
          : item
      )
      const { total, itemCount } = calculateTotals(newItems)
      return { items: newItems, total, itemCount }
    })
  }

  const clearCart = () => {
    setCart({ items: [], total: 0, itemCount: 0 })
    setIsCartOpen(false)
  }

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      isCartOpen,
      setIsCartOpen
    }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error("useCart must be used within CartProvider")
  }
  return context
}