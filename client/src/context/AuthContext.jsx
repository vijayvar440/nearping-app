import React, {
  createContext,
  useState,
  useEffect,
} from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const [token, setToken] = useState(
    () => localStorage.getItem("token") || ""
  );

  const [loading, setLoading] = useState(true);

  // ==========================================
  // 🔄 RESTORE LOGIN SESSION
  // ==========================================

  useEffect(() => {
    try {
      const savedUser =
        localStorage.getItem("user");

      const savedToken =
        localStorage.getItem("token");

      if (savedUser && savedToken) {
        const parsedUser =
          JSON.parse(savedUser);

        setUser(parsedUser);
        setToken(savedToken);
      } else {
        setUser(null);
        setToken("");
      }
    } catch (error) {
      console.error(
        "❌ Failed to restore user session:",
        error
      );

      localStorage.removeItem("user");
      localStorage.removeItem("token");

      setUser(null);
      setToken("");
    } finally {
      setLoading(false);
    }
  }, []);

  // ==========================================
  // 🔐 LOGIN
  // ==========================================

  const login = (userData, userToken) => {
    if (!userData || !userToken) {
      console.error(
        "❌ Login failed: user data or token missing."
      );
      return false;
    }

    setUser(userData);
    setToken(userToken);

    localStorage.setItem(
      "user",
      JSON.stringify(userData)
    );

    localStorage.setItem(
      "token",
      userToken
    );

    return true;
  };

  // ==========================================
  // 🚪 LOGOUT
  // ==========================================

  const logout = () => {
    setUser(null);
    setToken("");

    localStorage.removeItem("user");
    localStorage.removeItem("token");

    // Agar purane versions me ye values
    // save hui ho to unhe bhi clear kar do.
    localStorage.removeItem("userId");
  };

  // ==========================================
  // 👤 UPDATE USER DATA
  // ==========================================

  const updateUser = (updatedUser) => {
    if (!updatedUser) return;

    setUser(updatedUser);

    localStorage.setItem(
      "user",
      JSON.stringify(updatedUser)
    );
  };

  // ==========================================
  // 🔑 AUTH STATUS
  // ==========================================

  const isAuthenticated =
    Boolean(user && token);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};