import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserPrincipal, Role, EmployeeType } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: UserPrincipal | null;
  token: string | null;
  isAuthenticated: boolean;
  mustChangePassword: boolean;
  login: (email: string, pass: string) => Promise<void>;
  quickLogin: (role: Role) => Promise<void>;
  forceChangePassword: (oldPass: string, newPass: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PERSONA_PROFILES: Record<Role, { id: number; fullName: string; employeeCode: string; email: string; employeeType: EmployeeType }> = {
  SYSTEM_ADMIN: { id: 3, fullName: 'Nguyễn Hữu Thịnh', employeeCode: 'HM-003', email: 'admin.thinh@haiminh.vn', employeeType: 'OFFICE_STAFF' },
  ADMIN: { id: 3, fullName: 'Nguyễn Hữu Thịnh', employeeCode: 'HM-003', email: 'admin.thinh@haiminh.vn', employeeType: 'OFFICE_STAFF' },
  DIRECTOR: { id: 1, fullName: 'Lê Phúc Hà', employeeCode: 'HM-001', email: 'ceo.ha@haiminh.vn', employeeType: 'OFFICE_STAFF' },
  CEO: { id: 1, fullName: 'Lê Phúc Hà', employeeCode: 'HM-001', email: 'ceo.ha@haiminh.vn', employeeType: 'OFFICE_STAFF' },
  HR_MANAGER: { id: 4, fullName: 'Nguyễn Thu Giang', employeeCode: 'HM-004', email: 'hr.giang@haiminh.vn', employeeType: 'OFFICE_STAFF' },
  HR_STAFF: { id: 15, fullName: 'Phạm Thị Mai', employeeCode: 'HM-015', email: 'hrstaff.mai@haiminh.vn', employeeType: 'OFFICE_STAFF' },
  CHIEF_ACCOUNTANT: { id: 2, fullName: 'Đoàn Anh Tuấn', employeeCode: 'HM-002', email: 'ketoantruong.tuan@haiminh.vn', employeeType: 'OFFICE_STAFF' },
  ACCOUNTANT: { id: 16, fullName: 'Hoàng Thị Lan', employeeCode: 'HM-016', email: 'ketoan.lan@haiminh.vn', employeeType: 'OFFICE_STAFF' },
  SITE_MANAGER: { id: 5, fullName: 'Nguyễn Lê Gia Phát', employeeCode: 'HM-005', email: 'chihuytruong.phat@haiminh.vn', employeeType: 'SITE_ENGINEER' },
  SITE_ENGINEER: { id: 6, fullName: 'Trần Văn Trung', employeeCode: 'HM-006', email: 'kysu.trung@haiminh.vn', employeeType: 'SITE_ENGINEER' },
  OFFICE_STAFF: { id: 17, fullName: 'Vũ Hải Đăng', employeeCode: 'HM-017', email: 'vanphong.dang@haiminh.vn', employeeType: 'OFFICE_STAFF' },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserPrincipal | null>(() => {
    const saved = localStorage.getItem('hmcps_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.role && PERSONA_PROFILES[parsed.role as Role]) {
          const profile = PERSONA_PROFILES[parsed.role as Role];
          if (parsed.fullName !== profile.fullName || parsed.employeeCode !== profile.employeeCode) {
            return {
              ...parsed,
              id: profile.id,
              fullName: profile.fullName,
              employeeCode: profile.employeeCode,
              email: profile.email,
              employeeType: profile.employeeType,
            };
          }
        }
        return parsed;
      } catch {
        return null;
      }
    }
    return null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('hmcps_access_token');
  });
  const [mustChangePassword, setMustChangePassword] = useState<boolean>(false);

  useEffect(() => {
    if (user && token) {
      localStorage.setItem('hmcps_user', JSON.stringify(user));
      localStorage.setItem('hmcps_access_token', token);
    } else {
      localStorage.removeItem('hmcps_user');
      localStorage.removeItem('hmcps_access_token');
    }
  }, [user, token]);

  const login = async (email: string, pass: string) => {
    const res = await api.login(email, pass);
    if (res.mustChangePassword || res.tokenType === 'PreAuth') {
      setMustChangePassword(true);
      setToken(res.accessToken);
      return;
    }

    // Normalize backend role (e.g., ROLE_DIRECTOR -> DIRECTOR)
    let normalizedRole: Role = 'OFFICE_STAFF';
    const r = (res.role || '').replace(/^ROLE_/, '');
    if (r === 'ADMIN' || r === 'SYSTEM_ADMIN') normalizedRole = 'SYSTEM_ADMIN';
    else if (r === 'DIRECTOR' || r === 'CEO') normalizedRole = 'DIRECTOR';
    else if (r === 'CHIEF_ACCOUNTANT') normalizedRole = 'CHIEF_ACCOUNTANT';
    else if (r === 'PAYROLL_ACCOUNTANT' || r === 'ACCOUNTANT') normalizedRole = 'ACCOUNTANT';
    else if (r === 'HR_MANAGER') normalizedRole = 'HR_MANAGER';
    else if (r === 'HR_OFFICER' || r === 'HR_STAFF') normalizedRole = 'HR_STAFF';
    else if (r === 'SITE_MANAGER') normalizedRole = 'SITE_MANAGER';
    else if (r === 'SITE_ENGINEER') normalizedRole = 'SITE_ENGINEER';
    else if (r === 'SUPERVISOR') normalizedRole = 'DIRECTOR';
    else normalizedRole = (r as Role) || 'OFFICE_STAFF';

    const principal: UserPrincipal = {
      id: res.employeeId,
      email: res.email,
      fullName: res.fullName,
      role: normalizedRole,
      employeeCode: res.employeeCode,
      employeeType: normalizedRole === 'SITE_ENGINEER' || normalizedRole === 'SITE_MANAGER' ? 'SITE_ENGINEER' : 'OFFICE_STAFF',
    };

    setUser(principal);
    setToken(res.accessToken);
    setMustChangePassword(false);
  };

  const quickLogin = async (role: Role) => {
    const profile = PERSONA_PROFILES[role] || PERSONA_PROFILES.CHIEF_ACCOUNTANT;
    try {
      await login(profile.email, 'Password123@');
    } catch {
      // Fallback
    }

    // Always ensure the active user profile strictly matches the selected persona
    const principal: UserPrincipal = {
      id: profile.id,
      email: profile.email,
      fullName: profile.fullName,
      role: role,
      employeeCode: profile.employeeCode,
      employeeType: profile.employeeType,
    };
    setUser(principal);
    setToken('mock_jwt_token_' + profile.id);
    setMustChangePassword(false);
  };

  const forceChangePassword = async (oldPass: string, newPass: string) => {
    const res = await api.forceChangePassword(oldPass, newPass);
    const principal: UserPrincipal = {
      id: res.employeeId,
      email: res.email,
      fullName: res.fullName,
      role: res.role,
      employeeCode: res.employeeCode,
      employeeType: res.role === 'SITE_ENGINEER' || res.role === 'SITE_MANAGER' ? 'SITE_ENGINEER' : 'OFFICE_STAFF',
    };
    setUser(principal);
    setToken(res.accessToken);
    setMustChangePassword(false);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setMustChangePassword(false);
    localStorage.clear();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        mustChangePassword,
        login,
        quickLogin,
        forceChangePassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
