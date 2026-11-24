import React, { useEffect, useState, lazy, Suspense, useRef, Component } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate, useLocation, useNavigationType } from 'react-router-dom';
import Navbar from './components/Navbar';
import NetworkStatus from './components/NetworkStatus';
import CartDrawer from './components/CartDrawer';
import GlobalToast from './components/GlobalToast';
import { useCart } from './context/CartContext';
import { useProducts } from './context/ProductsContext';
import { useLanguage } from './context/LanguageContext';
import { useWishlist } from './context/WishlistContext';
import { useAuthModal } from './context/AuthModalContext';
import ImageSlider from './components/ImageSlider';
import { Heart } from 'lucide-react';
import { API_BASE_URL, resolveMediaUrl } from './services/api';
import { formatProductDisplayName, formatProductPackSize, formatCurrency } from './utils/productFormatters';

// Synchronous shared components
import ProductCard from './components/ProductCard';
import BottomNavCapsule from './components/BottomNavCapsule';
import { MobileNavScrollProvider, useMobileNavScroll } from './context/MobileNavScrollContext';


// Lazy loaded page routes for optimal mobile performance and smaller initial bundle
const Shop = lazy(() => import('./pages/Shop'));
const ProductDetails = lazy(() => import('./pages/ProductDetails'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));

// Lazy loaded routes for better performance on less frequent pages
const Login = lazy(() => import('./pages/Login'));

const Admin = lazy(() => import('./pages/Admin'));
const Profile = lazy(() => import('./pages/Profile'));
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderTracking = lazy(() => import('./pages/OrderTracking'));
const OtpVerification = lazy(() => import('./pages/OtpVerification'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Cart = lazy(() => import('./pages/Cart'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const Terms = lazy(() => import('./pages/Terms'));
const Faq = lazy(() => import('./pages/Faq'));
const BundleLanding = lazy(() => import('./pages/BundleLanding'));
const ProductAdLanding = lazy(() => import('./pages/ProductAdLanding'));
const ComboOffersSection = lazy(() => import('./components/ComboOffersSection'));
import SeoHead from './components/SeoHead';

import './App.css';
import './pages/Shop.css'; // Reuse shop styles for grid

import CategoryStrip from './components/CategoryStrip';
import BrandsSlider from './components/BrandsSlider';
import FloatingSocials from './components/FloatingSocials';

const ShoppableVideos = lazy(() => import('./components/ShoppableVideos'));
const GoogleReviews = lazy(() => import('./components/GoogleReviews'));

const HandpickedDeals = lazy(() => import('./components/HandpickedDeals'));
const OurJourney = lazy(() => import('./components/OurJourney'));
import Footer from './components/Footer';
import OrderSuccess from './pages/OrderSuccess';
import PaymentFailed from './pages/PaymentFailed';
const TrustBadges = lazy(() => import('./components/TrustBadges'));



import s1 from './assets/S1.webp';
import s2 from './assets/S2.webp';
import s3 from './assets/S3.webp';
import s4 from './assets/S4.webp';
import s5 from './assets/S5.webp';
import s6 from './assets/S6.webp';
import SliderPopup from './components/SliderPopup';
// Using dynamic products now from ProductsContext

// Error Boundary to catch lazy-loaded page crashes
class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('Route Error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '120px 20px 60px', textAlign: 'center', minHeight: '60vh' }}>
          <h2 style={{ color: '#ef4444' }}>Something went wrong</h2>
          <p style={{ color: '#64748b', margin: '12px 0' }}>{this.state.error?.message || 'Unknown error'}</p>
          <button onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            style={{ padding: '10px 24px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function Home() {
  const { products } = useProducts();
  const { t } = useLanguage();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const promoSliderRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isMobile) return;

    let isInteracting = false;
    let isVisible = false;
    let timeoutId = null;
    let intervalId = null;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0.1 }
    );
    if (promoSliderRef.current) observer.observe(promoSliderRef.current);

    const startAutoScroll = () => {
      intervalId = setInterval(() => {
        const container = promoSliderRef.current;
        if (!container || isInteracting || !isVisible) return;

        const { scrollLeft, scrollWidth, clientWidth } = container;
        const cardWidth = 296;

        if (scrollLeft + clientWidth >= scrollWidth - 20) {
          container.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          container.scrollBy({ left: cardWidth, behavior: 'smooth' });
        }
      }, 3500);
    };

    const handleInteraction = () => {
      isInteracting = true;
      if (intervalId) clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);

      timeoutId = setTimeout(() => {
        isInteracting = false;
        startAutoScroll();
      }, 6000);
    };

    const container = promoSliderRef.current;
    if (container) {
      container.addEventListener('touchstart', handleInteraction, { passive: true });
      container.addEventListener('mousedown', handleInteraction);
    }

    startAutoScroll();

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
      observer.disconnect();
      if (container) {
        container.removeEventListener('touchstart', handleInteraction);
        container.removeEventListener('mousedown', handleInteraction);
      }
    };
  }, [isMobile]);

  const [featuredProducts, setFeaturedProducts] = useState(() => {
    try {
      const cached = sessionStorage.getItem('dharani_most_loved_live_mem');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  });

  useEffect(() => {
    // Purge any legacy product caches from client localStorage
    try {
      localStorage.removeItem('dharani_featured_cache_v11');
      localStorage.removeItem('dharani_featured_cache_v9');
      localStorage.removeItem('dharani_products_cache_customer_v8');
      localStorage.removeItem('dharani_products_cache_store_v8');
      localStorage.removeItem('dharani_categories_cache');
      localStorage.removeItem('dharani_brands_cache');
      localStorage.removeItem('dharani_bundle_offers');
    } catch (e) {}

    const fetchMostLoved = async () => {
      const mostLovedUrl = 'https://dharaniherbbals.in/herbal/most-loved/';

      const applyData = (rawList) => {
        if (!Array.isArray(rawList) || rawList.length === 0) return;
        const mappedData = rawList.map(p => {
          const displayName = formatProductDisplayName(p.name);
          const displayTamilName = formatProductDisplayName(p.tamil_name || p.name);
          const priceNum = parseFloat(p.customer_price || p.price || p.mrp || 0);
          const mrpNum = parseFloat(p.mrp || p.price || 0);

          let validatedImage = p.image ? resolveMediaUrl(p.image) : '';
          if (!validatedImage && Array.isArray(p.extra_images) && p.extra_images.length > 0) {
            validatedImage = resolveMediaUrl(p.extra_images[0]);
          }

          const rawRating = (p.rating !== null && p.rating !== undefined && p.rating !== '') ? Number(p.rating) : null;
          const rawReviews = (p.reviews !== null && p.reviews !== undefined && p.reviews !== '') ? Number(p.reviews) : null;

          return {
            id: p.id,
            brand: p.brand || 'Dharani Herbals',
            brand_id: p.brand_id || null,
            name: displayName,
            raw_name: p.name,
            tamil_name: displayTamilName,
            subtitle: p.description ? (p.description.length > 70 ? p.description.substring(0, 70) + '...' : p.description) : 'Pure authentic South Indian botanical formulation.',
            price: formatCurrency(priceNum),
            originalPrice: mrpNum > priceNum ? formatCurrency(mrpNum) : '',
            discount: mrpNum > priceNum ? `${Math.round(((mrpNum - priceNum) / mrpNum) * 100)}% OFF` : '',
            rating: (rawRating !== null && !isNaN(rawRating) && rawRating > 0) ? rawRating : 5.0,
            reviews: (rawReviews !== null && !isNaN(rawReviews) && rawReviews > 0) ? rawReviews : 1,
            image: validatedImage,
            extra_images: Array.isArray(p.extra_images) ? p.extra_images.map(img => resolveMediaUrl(img)) : [],
            category_name: p.category_name || (p.category === 8 ? 'Baby' : 'Herbal Care'),
            description: p.description || '',
            pack_size: formatProductPackSize(p),
            variations: p.variations || []
          };
        });

        setFeaturedProducts(mappedData);
        try {
          sessionStorage.setItem('dharani_most_loved_live_mem', JSON.stringify(mappedData));
        } catch (e) {}
      };

      const fetchSingle = async (url) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        try {
          const res = await fetch(url, {
            cache: 'no-store',
            signal: controller.signal,
            headers: {
              'Accept': 'application/json',
              'ngrok-skip-browser-warning': 'true'
            }
          });
          clearTimeout(timeoutId);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          const rawList = Array.isArray(data) ? data : (data.data || data.results || []);
          if (Array.isArray(rawList) && rawList.length > 0) return rawList;
          throw new Error('Empty');
        } catch (e) {
          clearTimeout(timeoutId);
          throw e;
        }
      };

      // Fetch Most Loved products only from the CRM-connected Dharani API
try {
    const rawList = await fetchSingle(mostLovedUrl);
    applyData(rawList);
} catch (error) {
    console.error('Failed to fetch Most Loved products:', error);
}
    };

    fetchMostLoved();
  }, []);

  const navigate = useNavigate();

  const [promoAds] = useState([
    { img: s1, alt: "Promo 1", productId: 1260 },
    { img: s2, alt: "Promo 2", productId: 1142 },
    { img: s3, alt: "Promo 3", productId: 1394 },
    { img: s4, alt: "Promo 4", productId: 1138 },
    { img: s5, alt: "Promo 5", productId: 1248 },
    { img: s6, alt: "Promo 6", productId: 1249 }
  ]);


  return (
    <div style={{ width: '100%' }}>
      <SeoHead
        title="Dharani Herbals | Authentic Siddha & Herbal Products"
        description="Discover 100% authentic South Indian herbal products, botanical hair care, natural skincare, and traditional wellness formulations from Dharani Herbals."
        canonicalUrl="https://www.dharaniherbbals.in/"
        openGraph={{
          title: "Dharani Herbals | Authentic Siddha & Herbal Products",
          description: "Discover 100% authentic South Indian herbal products, botanical hair care, natural skincare, and traditional wellness formulations from Dharani Herbals.",
          url: "https://www.dharaniherbbals.in/",
          image: "https://www.dharaniherbbals.in/logo.png",
          type: "website"
        }}
        keywords={['dharani herbals', 'herbal products', 'siddha wellness', 'chemparuthi herbal shampoo', 'herbal hair oil', 'pure herbal skincare']}
      />
      {/* Full-width Image Slider */}
      <ImageSlider />

      <CategoryStrip />

      <div className="page-container" style={{ paddingTop: '20px' }}>

        {/* Featured Products Section (Ultra UI Bestsellers) */}
        <div
          className="reveal bento-header"
          style={{
            background: 'linear-gradient(135deg, rgba(74,222,128,0.2) 0%, rgba(34,197,94,0.1) 100%)',
            borderColor: 'rgba(74,222,128,0.3)'
          }}
        >
          {/* Decorative background blob */}
          <div className="bento-header-blob left"></div>

          <div className="bento-title-col">
          { /* <div className="bento-title-badge">✦ SIDDHA & HERBAL BESTSELLERS ✦</div> */}
            <h2 className="bento-title-text">
              {(() => {
                const words = t('featuredTitle').split(' ');
                const lastWord = words.pop();
                return (
                  <div style={{ flex: 1, minWidth: 0, wordWrap: 'break-word' }}>
                    {words.join(' ')} {lastWord}
                  </div>
                );
              })()}
            </h2>
          </div>

          <div className="bento-desc-col">
            <p className="bento-desc-text">
              {t('featuredSubtitle')}
            </p>
          </div>
        </div>

        {/* Strictly display dynamic products from the most-loved API (no local catalog fallback) */}
        <div className="shop-grid reveal-stagger" style={{ marginTop: '8px' }}>
          {featuredProducts.map((product, idx) => (
            <ProductCard key={product.id} product={product} index={idx} />
          ))}
        </div>

        <div className="reveal" style={{ textAlign: 'center', marginTop: '40px' }}>
          <Link to="/shop" className="btn-view-more">
            {t('viewAll')} &gt;
          </Link>
        </div>

        <Suspense fallback={<div style={{ height: '50vh' }}></div>}>
          {/* Curated Combo & Value Packs Section */}
          <div className="reveal" style={{ marginTop: '8px' }}>
            <ComboOffersSection />
          </div>

          {/* Shoppable Videos Section */}
          <div className="reveal">
            <ShoppableVideos />
          </div>

          {/* Handpicked Deals Section */}
          <div className="reveal" style={{ marginTop: '40px' }}>
            <HandpickedDeals />
          </div>

          {/* Bento Grid Ads Section */}
          <div className="reveal bento-header with-margin-top">
            {/* Decorative background blob */}
            <div className="bento-header-blob left"></div>

            <div className="bento-title-col">
              <h2 className="bento-title-text">
                <div>{t('apothecaryReserve')}</div>
              </h2>
            </div>

            <div className="bento-desc-col">
              <p className="bento-desc-text">
                {t('apothecaryDesc')}
              </p>
            </div>
          </div>

          {/* Auto-Sliding Promo Train */}
          <div ref={promoSliderRef} className="promo-slider-container reveal-stagger">
            <div className="promo-train-track">
              {(isMobile ? promoAds : [...promoAds, ...promoAds]).map((ad, index) => (
                <div key={index} className="promo-slider-item" onClick={() => navigate(`/product/${ad.productId}`)}>
                  <img src={ad.img} alt={ad.alt} className="promo-slider-img" loading="lazy" decoding="async" />
                  <div className="promo-slider-action">
                    <span className="arrow-icon">↗</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Our Journey Section */}
          <div className="reveal">
            <OurJourney />
          </div>



          {/* Trust Badges Section */}
          <div className="reveal">
            <TrustBadges />
          </div>
        </Suspense>

      </div>

      {/* Brands Slider Section */}
      <BrandsSlider />

      {/* Footer Section */}
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    if (navType !== 'POP') {
      window.scrollTo(0, 0);
    }
  }, [pathname, navType]);

  return null;
}

function AppContent() {
  const location = useLocation();
  const { isProductListingRoute } = useMobileNavScroll();
  const { isLoginModalOpen } = useAuthModal();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isAdRoute = location.pathname.startsWith('/ad/');
  const isInfoOrPolicyRoute = [
    '/policies', '/privacy', '/terms', '/terms-and-conditions', 
    '/faqs', '/faq', '/help', '/shipping', '/shipping-policy', 
    '/refund', '/refunds', '/returns', '/return-policy', '/cancellation'
  ].includes(location.pathname);

  return (
    <div className="app-container">
      <ScrollToTop />
      {!isAdminRoute && !isAdRoute && <Navbar />}
      <NetworkStatus />
      {!isAdminRoute && <CartDrawer />}
      {!isAdminRoute && !isInfoOrPolicyRoute && !isAdRoute && <FloatingSocials />}
      {!isAdminRoute && !isInfoOrPolicyRoute && !isAdRoute && <SliderPopup />}
      {!isAdminRoute && isLoginModalOpen && (
        <Suspense fallback={null}>
          <Login />
        </Suspense>
      )}
      <GlobalToast />
      <WishlistToastNotification />
      <main className="main-content" style={isAdminRoute || isAdRoute ? { padding: 0 } : {}}>
        <RouteErrorBoundary>
          <Suspense
            fallback={
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '14px', color: '#10b981' }}>
                <div style={{ width: '36px', height: '36px', border: '3px solid rgba(16, 185, 129, 0.2)', borderTopColor: '#10b981', borderRadius: '50%', animation: 'routeSpin 0.8s linear infinite' }} />
                <style>{`@keyframes routeSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/order-success" element={<OrderSuccess />} />
              <Route path="/payment-failed" element={<PaymentFailed />} />
              <Route path="/track/:orderId" element={<OrderTracking />} />
              <Route path="/product/:id" element={<ProductDetails />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/verify-otp" element={<OtpVerification />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/wishlist" element={<Navigate to="/profile" state={{ activeTab: 'wishlist' }} replace />} />
              <Route path="/admin/*" element={<Admin />} />
              <Route path="/combo/:bundleId" element={<BundleLanding />} />
              <Route path="/bundle/:bundleId" element={<BundleLanding />} />
              <Route path="/ad/:productId" element={<ProductAdLanding />} />
              <Route path="/privacy" element={<PrivacyPolicy initialTab="privacy" />} />
              <Route path="/policies" element={<PrivacyPolicy />} />
              <Route path="/shipping" element={<PrivacyPolicy initialTab="shipping" />} />
              <Route path="/shipping-policy" element={<PrivacyPolicy initialTab="shipping" />} />
              <Route path="/refund" element={<PrivacyPolicy initialTab="refunds" />} />
              <Route path="/refunds" element={<PrivacyPolicy initialTab="refunds" />} />
              <Route path="/returns" element={<PrivacyPolicy initialTab="refunds" />} />
              <Route path="/return-policy" element={<PrivacyPolicy initialTab="refunds" />} />
              <Route path="/cancellation" element={<PrivacyPolicy initialTab="cancellation" />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/terms-and-conditions" element={<Terms />} />
              <Route path="/faqs" element={<Faq />} />
              <Route path="/faq" element={<Faq />} />
              <Route path="/help" element={<Faq />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </RouteErrorBoundary>
      </main>
      {!isAdminRoute && !isAdRoute && isProductListingRoute && <BottomNavCapsule />}
    </div>

  );
}

function WishlistToastNotification() {
  const { recentWishlistAction } = useWishlist();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [toastType, setToastType] = useState('added');
  const { language } = useLanguage();
  let timerRef = useRef(null);

  useEffect(() => {
    if (recentWishlistAction) {
      setToastType(recentWishlistAction.type || 'added');
      setVisible(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setVisible(false), 2000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [recentWishlistAction]);

  return (
    <div
      className={`wishlist-toast ${visible ? 'visible' : ''}`}
      onClick={() => {
        setVisible(false);
        navigate('/profile', { state: { activeTab: 'wishlist' } });
      }}
    >
      <Heart size={20} fill={toastType === 'added' ? "#22c55e" : "transparent"} color={toastType === 'added' ? "#22c55e" : "#ef4444"} />
      <span>
        {toastType === 'added' 
          ? (language === 'ta' ? 'விருப்பப்பட்டியலில் சேர்க்கப்பட்டது' : 'Added to Wishlist')
          : (language === 'ta' ? 'விருப்பப்பட்டியலில் இருந்து நீக்கப்பட்டது' : 'Removed from Wishlist')}
      </span>
      <span className="wishlist-toast-view">{language === 'ta' ? 'பார்க்க' : 'View'}</span>
    </div>
  );
}

function App() {
  return (
    <Router>
      <MobileNavScrollProvider>
        <AppContent />
      </MobileNavScrollProvider>
    </Router>
  );
}

export default App;
