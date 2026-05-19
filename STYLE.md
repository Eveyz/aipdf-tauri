# AiPDF Design System & Style Guide

This document outlines the core design principles and component styles for the AiPDF project. Adhering to these guidelines ensures a consistent, professional, and "blazingly fast" user experience.

## 🎨 Core Philosophy: "The Invisible UI"
The interface should be minimalist and distraction-free. We prioritize content (the PDF) and functionality (the AI) over heavy UI elements.

### 🌟 General Design Principles
- **Sleek:** Everything should feel smooth, integrated, and high-end. Avoid "clunky" elements like thick borders, heavy shadows, or nested boxes. Use tight alignments and uniform spacing to create a cohesive whole.
- **Minimalist:** If an element doesn't serve a critical function, remove it. If it does serve a function, make it as visually quiet as possible. Prefer icons over text, and transparency over solid backgrounds.
- **Modern:** Follow the aesthetics of modern professional tools (like VS Code, Linear, or Apple's native apps). This means using subtle grays, vibrant but purposeful accent colors (Blue/Green), and plenty of whitespace to let the interface "breathe."

### 🚀 Key Tenets
- **Minimalism:** Remove unnecessary borders, shadows, and backgrounds.
- **Performance-First:** Use native-feeling interactions and lightweight CSS.
- **Icon-Driven:** Prioritize clean iconography for frequent actions.
- **Subtle Feedback:** Use soft hover states and transitions rather than high-contrast changes.

---

## 🛠️ Component Guidelines

### 1. Buttons & Toolbars
- **Standard Size:** Toolbar buttons should be a perfect square, typically `h-7 w-7` (28x28px).
- **Style:** Prefer **Ghost/Borderless** styles.
  - Default: `bg-transparent`, no border, no shadow.
  - Hover: `bg-gray-100` or `bg-blue-50` for AI actions.
- **Iconography:** Use 3.5 or 4 size icons (e.g., `w-3.5 h-3.5`).
- **No Text:** In compact toolbars (like the chat input), use icon-only buttons with a `title` attribute for tooltips.

### 2. Dropdowns & Selects (Sleek Mode)
- **Triggers:**
  - Borderless and background-less by default.
  - Hide the `ChevronDown` icon for icon-only triggers (using `[&>svg]:hidden` or similar).
  - Use `font-medium` (not bold) and `text-[11px]` for a professional, compact feel.
- **Menu Items:**
  - Use small icons or color dots (e.g., Green for local, Blue for cloud) to provide at-a-glance status.
  - Use `truncate` for long names in the trigger to maintain layout stability.

### 3. Inputs & Textareas
- **Styling:** Soft borders (`border-gray-200`) and subtle shadows.
- **Focus:** Use a light blue ring or border change (`focus-within:border-blue-400/60`).
- **Padding:** Generous but balanced (e.g., `px-3.5 py-3`).

---

## 🔡 Typography
- **Primary Font:** Clean Sans-serif.
- **Sizes:**
  - Standard: `text-sm` (14px).
  - Metadata/Labels: `text-[11px]` or `text-xs` (12px).
- **Weights:**
  - Prefer `font-normal` or `font-medium`. 
  - **Avoid Bold** (`font-bold`) in UI controls unless it's a primary CTA or a heading. Bold in toolbars often feels "heavy."

---

## 🚥 Color System
- **Action Blue:** `text-blue-600` / `bg-blue-50` (Used for Agent and primary AI actions).
- **UI Gray:** `text-gray-400` / `text-gray-500` (Used for standard "Ask" and secondary icons).
- **Success Green:** `bg-green-500` (Used for Local Model indicators).
- **Subtle Separators:** `border-gray-100` or `bg-gray-100`. Avoid high-contrast lines.

---

## 📱 Responsive & Adaptive Behavior
- **Context-Aware Labels:** Use `hidden sm:inline` for button labels. If space is tight, the label disappears and the button remains as a clean icon button.
- **Layout:** Use resizable panels to let users define their own workspace balance.

---

## ✨ Micro-interactions
- **Hover Transitions:** `transition-all duration-200`.
- **Active State:** Slight scale down (`active:scale-[0.98]`) for tactile feedback.
- **Loading:** Use soft pulses or spinning loaders (`animate-pulse`, `animate-spin`) in themed colors (blue for AI).
