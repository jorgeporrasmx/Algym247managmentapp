"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AuthenticatedLayout } from "@/components/authenticated-layout"
import Link from "next/link"
import { Plus, Package } from "lucide-react"

export default function AddProductPage() {
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    product_id: "",
    brand: "",
    type: "",
    category: "",
    supplier: "",
    supplier_email: "",
    supplier_website: "",
    gym: "",
    price: "0",
    cost: "0",
    quantity: "0",
    stock: "0",
    payment_method: "",
    sale_status: "registrado",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          price: formData.price === "" ? null : formData.price,
          cost: formData.cost === "" ? null : formData.cost,
          quantity: formData.quantity === "" ? null : formData.quantity,
          stock: formData.stock === "" ? null : formData.stock,
        }),
      })
      if (res.ok) {
        alert("Product created successfully!")
        setFormData({
          name: "",
          product_id: "",
          brand: "",
          type: "",
          category: "",
          supplier: "",
          supplier_email: "",
          supplier_website: "",
          gym: "",
          price: "0",
          cost: "0",
          quantity: "0",
          stock: "0",
          payment_method: "",
          sale_status: "registrado",
        })
      } else {
        const err = await res.json()
        alert(`Error: ${err.error}`)
      }
    } catch (err) {
      console.error("Error creating product", err)
      alert("Error creating product")
    } finally {
      setSubmitting(false)
    }
  }

  const set = (k: string, v: string) => setFormData(prev => ({ ...prev, [k]: v }))

  return (
    <AuthenticatedLayout
      title="Add Product"
      showBackButton
      backHref="/products"
      headerActions={
        <Button asChild>
          <Link href="/products">
            <Plus className="mr-2 h-4 w-4" />
            View Products
          </Link>
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>New Product</CardTitle>
          <CardDescription>Register a product, stock, and pricing.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={formData.name} onChange={e => set("name", e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="product_id">Product ID</Label>
              <Input id="product_id" value={formData.product_id} onChange={e => set("product_id", e.target.value)} placeholder="Auto if empty" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="brand">Brand</Label>
              <Input id="brand" value={formData.brand} onChange={e => set("brand", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
              <Input id="type" value={formData.type} onChange={e => set("type", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Input id="category" value={formData.category} onChange={e => set("category", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="gym">Gym</Label>
              <Input id="gym" value={formData.gym} onChange={e => set("gym", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="price">Price</Label>
              <Input id="price" type="number" step="0.01" value={formData.price} onChange={e => set("price", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cost">Cost</Label>
              <Input id="cost" type="number" step="0.01" value={formData.cost} onChange={e => set("cost", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input id="quantity" type="number" value={formData.quantity} onChange={e => set("quantity", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="stock">Stock</Label>
              <Input id="stock" type="number" value={formData.stock} onChange={e => set("stock", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Payment Method</Label>
              <Select value={formData.payment_method} onValueChange={(v) => set("payment_method", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Efectivo">Efectivo</SelectItem>
                  <SelectItem value="Tarjeta de Crédito">Tarjeta de Crédito</SelectItem>
                  <SelectItem value="Transferencia Bancaria">Transferencia Bancaria</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Sale</Label>
              <Select value={formData.sale_status} onValueChange={(v) => set("sale_status", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado de venta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="registrado">Registrado</SelectItem>
                  <SelectItem value="vendido">Vendido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={submitting}>
                <Package className="mr-2 h-4 w-4" />
                {submitting ? "Saving..." : "Save Product"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </AuthenticatedLayout>
  )
}


