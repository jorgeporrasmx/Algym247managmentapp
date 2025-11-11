-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT UNIQUE,
    name TEXT NOT NULL,
    brand TEXT,
    type TEXT,
    category TEXT,
    supplier TEXT,
    supplier_email TEXT,
    supplier_website TEXT,
    gym TEXT,
    price DECIMAL(10,2) DEFAULT 0,
    cost DECIMAL(10,2) DEFAULT 0,
    quantity TEXT DEFAULT '0', -- input quantity when creating/updating
    stock TEXT DEFAULT '0',    -- current stock on hand
    sold_this_month TEXT DEFAULT '0',
    total_sold_amount DECIMAL(12,2) DEFAULT 0, -- Total $ Sold
    last_sale TEXT,
    payment_method TEXT CHECK (payment_method IN ('Efectivo','Tarjeta de Crédito','Transferencia Bancaria')),
    sale_status TEXT CHECK (sale_status IN ('registrado','vendido')), -- Sale (register venta, vendido)
    last_update TEXT DEFAULT NOW()::text,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes to speed up lookups
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products (name);
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products (brand);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category);

-- Enable Row Level Security (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Public read access policy (match existing style)
CREATE POLICY "Allow public read access to products" ON public.products FOR SELECT USING (true);

-- Public write access for now (align with webhook-style openness used elsewhere)
CREATE POLICY "Allow public writes to products" ON public.products FOR ALL USING (true) WITH CHECK (true);

-- Trigger to keep updated_at in sync
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();


