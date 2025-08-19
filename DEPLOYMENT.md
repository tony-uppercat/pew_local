# Deployment Checklist

This document outlines the steps to ensure successful deployment to GitHub Pages.

## ✅ Pre-Deployment Checklist

### 1. Configuration Files
- [x] `astro.config.mjs` has correct `site` and `base` paths
- [x] `package.json` has all required scripts
- [x] `.github/workflows/deploy.yml` is properly configured
- [x] `public/manifest.json` has correct paths for GitHub Pages

### 2. Build Configuration
- [x] Astro output is set to `static`
- [x] PWA plugin is configured with correct paths
- [x] React integration is properly set up
- [x] Tailwind CSS is configured

### 3. File Paths
- [x] All static assets use correct base path (`/pew_local/`)
- [x] PWA manifest icons point to correct URLs
- [x] Service worker scope is properly configured
- [x] All internal links use relative paths

### 4. GitHub Repository
- [x] Repository is public (required for GitHub Pages)
- [x] GitHub Pages is enabled in repository settings
- [x] GitHub Actions has proper permissions
- [x] Main branch is set as source for GitHub Pages

## 🚀 Deployment Steps

### 1. Test Locally (if possible)
```bash
npm run test-build
npm run build
npm run preview
```

### 2. Commit and Push
```bash
git add .
git commit -m "Fix GitHub Pages deployment configuration"
git push origin main
```

### 3. Monitor Deployment
1. Go to [Actions tab](https://github.com/tony-uppercat/pew_local/actions)
2. Check the latest workflow run
3. Verify all steps complete successfully
4. Check for any error messages

### 4. Verify Deployment
1. Wait 2-5 minutes for deployment to complete
2. Visit [https://tony-uppercat.github.io/pew_local](https://tony-uppercat.github.io/pew_local)
3. Test PWA installation
4. Verify offline functionality
5. Check all assets load correctly

## 🔧 Troubleshooting

### Common Issues

#### Build Fails
- Check GitHub Actions logs for specific errors
- Verify all dependencies are in `package.json`
- Ensure Node.js version is compatible (18+)

#### Assets Not Loading
- Verify all paths use correct base path (`/pew_local/`)
- Check that files exist in `public/` directory
- Ensure manifest.json has correct icon paths

#### PWA Not Working
- Check service worker registration in browser dev tools
- Verify manifest.json is accessible
- Test on HTTPS (required for PWA features)

#### 404 Errors
- Ensure `base` path is correctly set in `astro.config.mjs`
- Check that all internal links are relative
- Verify GitHub Pages is serving from correct branch

### Debug Commands

```bash
# Test build configuration
npm run test-build

# Check Astro info
npx astro info

# Type check
npm run type-check

# Lint code
npm run lint
```

## 📋 Post-Deployment Verification

- [ ] Site loads without errors
- [ ] All images and assets display correctly
- [ ] PWA can be installed
- [ ] Offline functionality works
- [ ] Service worker is registered
- [ ] No console errors in browser
- [ ] Mobile responsiveness works
- [ ] Performance is acceptable

## 🔄 Continuous Deployment

Once configured, the site will automatically deploy on every push to the `main` branch. Monitor the Actions tab for any deployment issues.

## 📞 Support

If deployment issues persist:
1. Check GitHub Actions logs
2. Review browser console for errors
3. Verify all configuration files
4. Test with a minimal build first
