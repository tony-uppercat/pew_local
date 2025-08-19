# Pocket Expense Wallet (PEW)

A modern Progressive Web App (PWA) for tracking expenses with offline capabilities, receipt scanning, and secure local storage.

## 🚀 Features

- **Offline-First**: Works completely offline with local data storage
- **PWA Support**: Installable as a native app with automatic updates
- **Secure Storage**: Local encryption for sensitive financial data
- **Modern UI**: Built with React, Tailwind CSS, and Astro
- **Performance Optimized**: Fast loading with service worker caching

## 🛠️ Tech Stack

- **Framework**: [Astro](https://astro.build/) with React integration
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **PWA**: [Vite PWA Plugin](https://vite-pwa-astro.netlify.app/)
- **Database**: [Dexie.js](https://dexie.org/) (IndexedDB wrapper)
- **Storage**: Local IndexedDB with encryption

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/tony-uppercat/pew_local.git
cd pew_local

# Install dependencies
npm install

# Start development server
npm run dev
```

## 🚀 Deployment

This project is configured for automatic deployment to GitHub Pages.

### Automatic Deployment (Recommended)

1. **Push to main branch**: The project automatically deploys when you push to the `main` branch
2. **Check Actions**: Monitor the deployment in the [Actions tab](https://github.com/tony-uppercat/pew_local/actions)
3. **Access your site**: Visit [https://tony-uppercat.github.io/pew_local](https://tony-uppercat.github.io/pew_local)

### Manual Deployment

```bash
# Test build configuration
npm run test-build

# Build for production
npm run build

# Preview build locally
npm run preview
```

### GitHub Pages Configuration

The project is configured with:
- **Base path**: `/pew_local`
- **Site URL**: `https://tony-uppercat.github.io/pew_local`
- **Build output**: Static files in `dist/` directory

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run test-build   # Test build configuration
npm run type-check   # Run TypeScript type checking
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
```

### Project Structure

```
pew_local/
├── src/
│   ├── components/     # React components
│   ├── layouts/        # Astro layouts
│   ├── lib/           # Utility libraries
│   ├── pages/         # Astro pages
│   └── styles/        # Global styles
├── public/            # Static assets
├── .github/           # GitHub Actions workflows
└── scripts/           # Build and utility scripts
```

## 🔒 Security & Privacy

- **Local Storage**: All data is stored locally in the browser
- **No Server**: No data is sent to external servers
- **Encryption**: Sensitive data is encrypted before storage
- **Privacy**: No tracking or analytics

## 🌐 Browser Support

- Chrome/Edge (recommended for full PWA features)
- Firefox
- Safari (limited PWA support)
- Mobile browsers

## 📱 PWA Features

- **Installable**: Add to home screen
- **Offline**: Works without internet connection
- **Updates**: Automatic background updates
- **Background Sync**: Sync when connection is restored

## 🐛 Troubleshooting

### Build Issues

If you encounter build issues:

1. **Clear cache**: Delete `node_modules/.vite` and `dist/` directories
2. **Reinstall dependencies**: Run `npm ci`
3. **Test configuration**: Run `npm run test-build`

### Deployment Issues

1. **Check Actions**: Verify the GitHub Actions workflow is running
2. **Review logs**: Check the build logs for specific errors
3. **Test locally**: Run `npm run build` locally to identify issues

### PWA Issues

1. **Clear service worker**: Use browser dev tools to unregister service worker
2. **Hard refresh**: Use Ctrl+Shift+R to bypass cache
3. **Check manifest**: Verify PWA manifest is loading correctly

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues and questions:
- Create an issue on GitHub
- Check the troubleshooting section above
- Review the browser console for error messages
