---
outline: deep
---

# Querying & Filtering — JavaScript / TypeScript

## Table of Contents

- [Querying \& Filtering — JavaScript / TypeScript](#querying--filtering--javascript--typescript)
    - [Table of Contents](#table-of-contents)
    - [Filtering and Recursive Descent](#filtering-and-recursive-descent)
        - [Filter expressions](#filter-expressions)
        - [Recursive descent](#recursive-descent)
        - [Combining filters with descent](#combining-filters-with-descent)
    - [Deep Merge](#deep-merge)

---

## Filtering and Recursive Descent

### Filter expressions

Use `[?field operator value]` to filter arrays:

```typescript
const data = {
    products: [
        { name: "Laptop", price: 1200, category: "electronics" },
        { name: "Phone", price: 800, category: "electronics" },
        { name: "Book", price: 25, category: "education" },
    ],
};

const accessor = SafeAccess.fromObject(data);

// Filter by equality
accessor.get("products[?category=='electronics'].name");
// ["Laptop", "Phone"]

// Filter by numeric comparison
accessor.get("products[?price>500].name");
// ["Laptop", "Phone"]

// Combine with AND / OR
accessor.get("products[?price>100 && category=='electronics'].name");
// ["Laptop", "Phone"]

accessor.get("products[?price>1000 || category=='education'].name");
// ["Laptop", "Book"]
```

### Recursive descent

Use `..key` to collect all values with that key at any nesting depth:

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

### Combining filters with descent

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

// All active store names across all regions
accessor.get("..stores[?active==true].name");
// ["Store A", "Store C"]
```

---

## Deep Merge

The `merge()` method deep-merges objects. Arrays and scalars are replaced, nested objects are merged recursively:

```typescript
const accessor = SafeAccess.fromObject({
    user: { name: "Ana", settings: { theme: "light", lang: "en" } },
});

// Merge at a specific path
const updated = accessor.merge("user.settings", {
    theme: "dark",
    notifications: true,
});
updated.get("user.settings.theme"); // "dark"
updated.get("user.settings.lang"); // "en" (preserved)
updated.get("user.settings.notifications"); // true

// Merge at root
const withMeta = accessor.merge({ version: "2.0", debug: false });
withMeta.get("version"); // "2.0"
withMeta.get("user.name"); // "Ana" (preserved)
```

---

## Combining Path Expressions

Segments can be freely combined in a single path. The query is evaluated left-to-right:

```typescript
const data = {
    catalog: [
        {
            id: 1,
            name: "Laptop",
            tags: ["electronics", "portable"],
            price: 1200,
        },
        { id: 2, name: "Phone", tags: ["electronics", "mobile"], price: 800 },
        { id: 3, name: "Desk", tags: ["furniture"], price: 300 },
        {
            id: 4,
            name: "Tablet",
            tags: ["electronics", "portable"],
            price: 600,
        },
    ],
};

const accessor = SafeAccess.fromObject(data);

// Filter, then pick a field
accessor.get("catalog[?price>500].name");
// ["Laptop", "Phone", "Tablet"]

// Slice, then wildcard
accessor.get("catalog[0:2].*.name");
// ["Laptop", "Phone"] (first 2 items, all names)

// Wildcard + filter on nested array (descent equivalent)
accessor.get("catalog[?price<700].tags.0");
// ["furniture", "electronics"] (first tag of cheap items)

// Combined AND filter + field pick
accessor.get("catalog[?price>500 && price<1000].name");
// ["Phone", "Tablet"]
```

---

## Dynamic Paths with `getTemplate()`

`getTemplate()` substitutes `{key}` placeholders in a path template before resolving it — useful when the path contains a value only known at runtime:

```typescript
const users = SafeAccess.fromObject({
    users: [
        { name: "Ana", role: "admin" },
        { name: "Bob", role: "user" },
    ],
});

// Resolve path with a dynamic index
users.getTemplate("users.{index}.name", { index: 0 }); // "Ana"
users.getTemplate("users.{index}.name", { index: 1 }); // "Bob"

// Multiple substitutions
const config = SafeAccess.fromObject({
    services: {
        auth: { host: "auth.example.com", port: 443 },
        api: { host: "api.example.com", port: 8080 },
    },
});

function getServiceHost(service: string, field: string): string {
    return config.getTemplate(
        "services.{service}.{field}",
        { service, field },
        "unknown",
    ) as string;
}

getServiceHost("auth", "host"); // "auth.example.com"
getServiceHost("api", "port"); // 8080
getServiceHost("db", "host"); // "unknown" (default)
```

---

## Batch Reads with `getMany()`

`getMany()` reads multiple paths in a single call, returning a map of path → value. Missing paths fall back to the provided default:

```typescript
const accessor = SafeAccess.fromObject({
    user: { name: "Ana", email: "ana@example.com", role: "admin" },
    settings: { theme: "dark" },
});

const values = accessor.getMany({
    "user.name": "Unknown",
    "user.email": "N/A",
    "user.phone": "N/A", // path does not exist — uses default
    "settings.theme": "light",
});

// {
//   "user.name": "Ana",
//   "user.email": "ana@example.com",
//   "user.phone": "N/A",
//   "settings.theme": "dark",
// }
```
