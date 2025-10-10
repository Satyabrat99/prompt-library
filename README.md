<<<<<<< HEAD
# prompt-library
=======
# 🎨 AI Studio - Prompt Library

A modern, dark-themed AI prompt library built with React, TypeScript, and Supabase. Features a sleek AI studio design with glass morphism effects, role-based access control, and comprehensive prompt management.

## ✨ Features

### 🎯 Core Functionality
- **Prompt Management**: Create, browse, and manage AI prompts
- **Category Organization**: Organize prompts by categories and difficulty levels
- **Search & Filter**: Advanced search and filtering capabilities
- **Favorites System**: Like and save favorite prompts
- **View Tracking**: Track prompt views and copy counts

### 🎨 Modern UI/UX
- **Dark AI Studio Theme**: Professional dark theme with green accents
- **Glass Morphism**: Modern frosted glass effects throughout
- **Responsive Design**: Works perfectly on all screen sizes
- **Smooth Animations**: Fluid transitions and hover effects
- **Landscape Cards**: Beautiful landscape-oriented category cards

### 🔐 Role-Based Access Control
- **User Roles**: Separate interfaces for users and admins
- **Admin Panel**: Complete admin dashboard with analytics
- **Protected Routes**: Secure access to admin-only features
- **User Management**: User profile and authentication system

### 🚀 Technical Features
- **Real-time Updates**: Live data synchronization with Supabase
- **Image Upload**: Drag-and-drop image upload with Supabase Storage
- **Optimistic UI**: Instant feedback with rollback on errors
- **Type Safety**: Full TypeScript implementation
- **Modern Stack**: React 18, Vite, Tailwind CSS, shadcn/ui

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **State Management**: React Query (TanStack Query)
- **Routing**: React Router DOM
- **Icons**: Lucide React
- **Build Tool**: Vite

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd muse-mosaic-space-main
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new Supabase project
   - Run the SQL scripts in the `supabase/` directory
   - Copy your Supabase URL and anon key

4. **Configure environment variables**
   Create a `.env.local` file:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

5. **Start the development server**
   ```bash
npm run dev
```

6. **Open your browser**
   Navigate to `http://localhost:5173`

## 📁 Project Structure

```
muse-mosaic-space-main/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # shadcn/ui components
│   │   ├── Layout.tsx      # Main layout component
│   │   └── ...
│   ├── pages/              # Page components
│   │   ├── admin/          # Admin-only pages
│   │   ├── Explore.tsx     # Main explore page
│   │   ├── Categories.tsx  # Categories page
│   │   └── ...
│   ├── hooks/              # Custom React hooks
│   ├── integrations/       # External service integrations
│   │   └── supabase/       # Supabase client and types
│   └── lib/                # Utility functions
├── supabase/               # Database migrations and config
├── public/                 # Static assets
└── README.md
```

## 🗄️ Database Schema

### Tables
- **prompts**: Main prompts table with metadata
- **categories**: Prompt categories
- **user_profiles**: User information and roles
- **user_interactions**: Tracks likes, views, and copies

### Key Features
- Row Level Security (RLS) enabled
- Automatic timestamps with triggers
- Optimized indexes for performance
- Foreign key constraints for data integrity

## 🎨 Design System

### Color Palette
- **Primary**: Green (`#22c55e`) - AI/tech theme
- **Background**: Dark blue (`#0f172a`) - Professional dark theme
- **Accent**: Emerald green for highlights
- **Text**: High contrast white and gray

### Components
- **Glass Morphism**: Semi-transparent cards with backdrop blur
- **Gradient Text**: Eye-catching headings
- **Smooth Animations**: 300ms transitions throughout
- **Responsive Grid**: Adaptive layouts for all screen sizes

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 📱 Screenshots

### Main Features
- **Explore Page**: Scattered grid layout with search and filters
- **Categories Page**: Landscape cards with text overlays
- **Admin Panel**: Complete management interface
- **Modal Views**: Detailed prompt information with actions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for beautiful components
- [Tailwind CSS](https://tailwindcss.com/) for utility-first styling
- [Supabase](https://supabase.com/) for backend services
- [Lucide React](https://lucide.dev/) for icons

## 📞 Support

If you have any questions or need help, please open an issue or contact the maintainers.

---

**Built with ❤️ using modern web technologies**
>>>>>>> master
