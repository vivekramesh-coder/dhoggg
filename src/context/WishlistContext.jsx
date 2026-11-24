import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../services/api';

const WishlistContext = createContext();

// Logged-in users get their own cache key so one account never shows another account's items.
const storageKeyFor = (user) => (user && user.id ? `dharani_wishlist_${user.id}` : 'dharani_wishlist');

const readWishlistFor = (user) => {
  try {
    const saved = localStorage.getItem(storageKeyFor(user));
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Error loading wishlist from local storage', e);
    return [];
  }
};

const writeWishlistFor = (user, list) => {
  try {
    localStorage.setItem(storageKeyFor(user), JSON.stringify(list));
  } catch (e) {
    console.error('Error saving wishlist to local storage', e);
  }
};

const getUser = () => {
  try {
    const stored = localStorage.getItem('user');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    const user = parsed.user || parsed;
    if (typeof user.id === 'string' && user.id.startsWith('user-')) {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      return null;
    }
    return user;
  } catch {
    return null;
  }
};

// Product id of a wishlist entry. Works for rows like { id, product: 12 } and for plain product objects.
// IDs are compared as strings so 12 and "12" are treated as the same product.
const productIdOf = (item) => {
  if (!item) return null;
  const raw = item.product !== undefined ? item.product : item.id;
  const id = raw && typeof raw === 'object' ? (raw.id ?? raw.pk) : raw;
  return id === undefined || id === null ? null : String(id);
};

// Id the delete endpoint expects: the wishlist row's pk when the row links to a product.
const deleteIdOf = (item) => (item.product !== undefined ? item.id : productIdOf(item));

const extractWishlistList = (data) => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  if (data && Array.isArray(data.wishlist)) return data.wishlist;
  if (data && Array.isArray(data.results)) return data.results;
  return null;
};

export function WishlistProvider({ children }) {
  const [wishlist, setWishlistState] = useState(() => readWishlistFor(getUser()));
  const [recentWishlistAction, setRecentWishlistAction] = useState(null);

  // Latest list, so handlers never act on a stale closure.
  const wishlistRef = useRef(wishlist);
  // Incremented on every add/remove. A server list fetched before a change must not overwrite that change.
  const mutationVersion = useRef(0);
  // Only the most recent refresh may apply its result.
  const refreshSeq = useRef(0);

  const commit = (next) => {
    wishlistRef.current = next;
    setWishlistState(next);
    writeWishlistFor(getUser(), next);
  };

  const refreshWishlist = async () => {
    const user = getUser();
    if (!user) return;

    const seq = ++refreshSeq.current;
    const versionAtStart = mutationVersion.current;

    try {
      // Cache-busted and no-store, like the address requests, so the browser never replays an old list.
      const res = await fetch(`${API_BASE_URL}/wishlist/${user.id}/?_t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });
      if (!res.ok) return;

      const list = extractWishlistList(await res.json());
      if (!list) return; // Unrecognised response: keep what is on screen.

      // Drop the result if a newer refresh started, a change happened meanwhile, or the user changed.
      if (seq !== refreshSeq.current) return;
      if (versionAtStart !== mutationVersion.current) return;
      if (getUser()?.id !== user.id) return;

      commit(list);
    } catch (err) {
      console.error('Error fetching wishlist:', err);
    }
  };

  // Load the server list on mount.
  useEffect(() => {
    refreshWishlist();
  }, []);

  // Switch lists on login/logout. Show this account's cached list at once, then sync from the server.
  useEffect(() => {
    const handleAuthChange = () => {
      commit(readWishlistFor(getUser()));
      refreshWishlist();
    };
    window.addEventListener('user-login-status-changed', handleAuthChange);
    return () => window.removeEventListener('user-login-status-changed', handleAuthChange);
  }, []);

  const addToWishlist = async (product) => {
    const user = getUser();
    const key = String(product.id);

    if (wishlistRef.current.some((item) => productIdOf(item) === key)) return;

    mutationVersion.current += 1;
    commit([...wishlistRef.current, product]);
    setRecentWishlistAction({ type: 'added', product, timestamp: Date.now() });

    if (user) {
      try {
        const res = await fetch(`${API_BASE_URL}/wishlist/add/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          },
          body: JSON.stringify({
            user_id: user.id,
            product_id: product.id
          })
        });
        if (!res.ok) console.warn('Wishlist add returned', res.status);
      } catch (err) {
        console.error('Error adding to wishlist:', err);
      }
      // The server is the source of truth: reconcile after the add either way.
      refreshWishlist();
    }
  };

  const removeFromWishlist = async (productId) => {
    const user = getUser();
    const key = String(productId);

    const list = wishlistRef.current;
    const index = list.findIndex((item) => productIdOf(item) === key);
    if (index === -1) return; // Already removed (e.g. a double click).
    const removedItem = list[index];

    // Remove from the screen immediately.
    mutationVersion.current += 1;
    commit(list.filter((_, i) => i !== index));
    setRecentWishlistAction({ type: 'removed', product: removedItem, timestamp: Date.now() });

    if (!user) return;

    try {
      const res = await fetch(`${API_BASE_URL}/wishlist/delete/${deleteIdOf(removedItem)}/`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({
          user_id: user.id
        })
      });
      // 404 means the row is already gone on the server, so the removal is still correct.
      if (!res.ok && res.status !== 404) {
        throw new Error(`Remove failed with status ${res.status}`);
      }
      // Server confirmed the delete. The on-screen list is already correct, so no extra GET is made
      // (a GET fired now could return a response that predates the delete).
    } catch (err) {
      console.error('Error removing from wishlist:', err);
      // The server still has the item: put it back at its original position.
      mutationVersion.current += 1;
      if (!wishlistRef.current.some((item) => productIdOf(item) === key)) {
        const restored = [...wishlistRef.current];
        restored.splice(Math.min(index, restored.length), 0, removedItem);
        commit(restored);
      }
      refreshWishlist();
    }
  };

  const isInWishlist = (productId) => {
    const key = String(productId);
    return wishlist.some((item) => productIdOf(item) === key);
  };

  const toggleWishlist = (product) => {
    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  };

  return (
    <WishlistContext.Provider
      value={{ wishlist, addToWishlist, removeFromWishlist, toggleWishlist, isInWishlist, recentWishlistAction, refreshWishlist }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export const useWishlist = () => useContext(WishlistContext);