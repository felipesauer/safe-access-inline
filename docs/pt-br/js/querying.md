---
outline: deep
---

# Consultas & Filtros — JavaScript / TypeScript

## Índice

- [Filtragem e Descida Recursiva](#filtragem-e-descida-recursiva)
- [Deep Merge](#deep-merge)

## Filtragem e Descida Recursiva

### Expressões de filtro

Use `[?campo operador valor]` para filtrar arrays:

```typescript
const data = {
    products: [
        { name: "Laptop", price: 1200, category: "electronics" },
        { name: "Phone", price: 800, category: "electronics" },
        { name: "Book", price: 25, category: "education" },
    ],
};

const accessor = SafeAccess.fromObject(data);

// Filtrar por igualdade
accessor.get("products[?category=='electronics'].name");
// ["Laptop", "Phone"]

// Filtrar por comparação numérica
accessor.get("products[?price>500].name");
// ["Laptop", "Phone"]

// Combinar com AND / OR
accessor.get("products[?price>100 && category=='electronics'].name");
// ["Laptop", "Phone"]

accessor.get("products[?price>1000 || category=='education'].name");
// ["Laptop", "Book"]
```

### Descida recursiva

Use `..key` para coletar todos os valores com essa chave em qualquer profundidade:

```typescript
const org = {
    name: "Corp",
    departments: {
        engineering: {
            name: "Engineering",
            teams: {
                frontend: { name: "Frontend", members: 5 },
                backend: { name: "Backend", members: 8 },
            },
        },
        marketing: { name: "Marketing", members: 3 },
    },
};

const accessor = SafeAccess.fromObject(org);
accessor.get("..name");
// ["Corp", "Engineering", "Frontend", "Backend", "Marketing"]

accessor.get("..members");
// [5, 8, 3]
```

### Combinando filtros com descida

```typescript
const data = {
    region1: {
        stores: [
            { name: "Store A", revenue: 50000, active: true },
            { name: "Store B", revenue: 20000, active: false },
        ],
    },
    region2: {
        stores: [{ name: "Store C", revenue: 80000, active: true }],
    },
};

const accessor = SafeAccess.fromObject(data);

// Nomes de todas as lojas ativas em todas as regiões
accessor.get("..stores[?active==true].name");
// ["Store A", "Store C"]
```

---

## Deep Merge

O método `merge()` faz deep-merge de objetos. Arrays e escalares são substituídos, objetos aninhados são mesclados recursivamente:

```typescript
const accessor = SafeAccess.fromObject({
    user: { name: "Ana", settings: { theme: "light", lang: "en" } },
});

// Merge em um caminho específico
const updated = accessor.merge("user.settings", {
    theme: "dark",
    notifications: true,
});
updated.get("user.settings.theme"); // "dark"
updated.get("user.settings.lang"); // "en" (preservado)
updated.get("user.settings.notifications"); // true

// Merge na raiz
const withMeta = accessor.merge({ version: "2.0", debug: false });
withMeta.get("version"); // "2.0"
withMeta.get("user.name"); // "Ana" (preservado)
```
