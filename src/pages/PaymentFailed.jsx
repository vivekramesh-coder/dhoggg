import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';

// Shown when a payment fails or is cancelled. Moves the customer back to their cart after a short pause
// so they can try again. Mirrors the OrderSuccess page; it never shows the success page.
const SHOW_DURATION_MS = 4000;

const shakeKeyframes = `
@keyframes dharani-payment-fail-pop {
  0%   { transform: scale(0.6); opacity: 0; }
  60%  { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes dharani-payment-fail-shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-6px); }
  40%, 80% { transform: translateX(6px); }
}
@media (prefers-reduced-motion: reduce) {
  .dharani-payment-fail-icon { animation: none !important; }
}
`;

export default function PaymentFailed() {
  const navigate = useNavigate();
  const location = useLocation();
  const rawOrderId = location.state?.orderId;
  const orderId = rawOrderId && rawOrderId !== 'Completed' ? rawOrderId : null;
  const hasState = Boolean(location.state);

  useEffect(() => {
    // Opened directly without a failed checkout: nothing to report, so go to the cart.
    if (!hasState) {
      navigate('/cart', { replace: true });
      return undefined;
    }
    const timer = setTimeout(() => {
      navigate('/cart', { replace: true });
    }, SHOW_DURATION_MS);
    return () => clearTimeout(timer);
  }, [hasState, navigate]);

  if (!hasState) return null;

  return (
    <div
      style={{
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        background: '#fef2f2',
      }}
    >
      <style>{shakeKeyframes}</style>
      <div
        role="alert"
        style={{
          maxWidth: '420px',
          width: '100%',
          background: '#fff',
          borderRadius: '16px',
          padding: '40px 24px',
          textAlign: 'center',
          boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
          border: '1px solid #fecaca',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <span
            className="dharani-payment-fail-icon"
            style={{
              display: 'inline-flex',
              animation:
                'dharani-payment-fail-pop 0.5s ease-out both, dharani-payment-fail-shake 0.6s ease-in-out 0.5s both',
            }}
          >
            <XCircle size={64} color="#DC2626" />
          </span>
        </div>
        <h2 style={{ color: '#DC2626', fontSize: '1.5rem', fontWeight: 700, marginBottom: '10px' }}>
          Payment Failed!
        </h2>
        <p style={{ color: '#374151', fontSize: '1rem', marginBottom: '6px' }}>
          Unfortunately, your payment could not be processed.
        </p>
        <p style={{ color: '#374151', fontSize: '1rem', marginBottom: '6px' }}>
          Please try again.
        </p>
        {orderId && (
          <p style={{ color: '#6B7280', fontSize: '0.95rem', marginTop: '10px', marginBottom: '6px' }}>
            Order ID: <strong>#{orderId}</strong>
          </p>
        )}
        <p style={{ color: '#9CA3AF', fontSize: '0.85rem', marginTop: '16px' }}>
          Taking you back to your cart...
        </p>
      </div>
    </div>
  );
}