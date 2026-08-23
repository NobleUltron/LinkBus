import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PortalShell } from './components/layout/PortalShell';
import { PublicLayout } from './components/layout/PublicLayout';
import { adminPortal, driverPortal, passengerPortal, staffPortal } from './components/layout/navConfig';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { Advertisements } from './pages/admin/Advertisements';
import { Buses } from './pages/admin/Buses';
import { Drivers } from './pages/admin/Drivers';
import { PromoCodes } from './pages/admin/PromoCodes';
import { Reports } from './pages/admin/Reports';
import { Roles } from './pages/admin/Roles';
import { Routes as RoutesAdmin } from './pages/admin/Routes';
import { SystemSettings } from './pages/admin/SystemSettings';
import { TerminalsAdmin } from './pages/admin/TerminalsAdmin';
import { Trips } from './pages/admin/Trips';
import { Users } from './pages/admin/Users';
import { DriverDashboard } from './pages/driver/DriverDashboard';
import { DriverTripDetail } from './pages/driver/DriverTripDetail';
import { BookTrip } from './pages/passenger/BookTrip';
import { MyTickets } from './pages/passenger/MyTickets';
import { PassengerDashboard } from './pages/passenger/PassengerDashboard';
import { About } from './pages/public/About';
import { Contact } from './pages/public/Contact';
import { Home } from './pages/public/Home';
import { Login } from './pages/public/Login';
import { Register } from './pages/public/Register';
import { Services } from './pages/public/Services';
import { Terminals } from './pages/public/Terminals';
import { TripSearch } from './pages/public/TripSearch';
import { BookingsScreen } from './pages/shared/BookingsScreen';
import { LuggageScreen } from './pages/shared/LuggageScreen';
import { ParcelsScreen } from './pages/shared/ParcelsScreen';
import { PaymentsScreen } from './pages/shared/PaymentsScreen';
import { PosTerminal } from './pages/shared/PosTerminal';
import { ProfileSettings } from './pages/shared/ProfileSettings';
import { TicketsScreen } from './pages/shared/TicketsScreen';
import { CheckIn } from './pages/staff/CheckIn';
import { StaffDashboard } from './pages/staff/StaffDashboard';
export function App() {
  return <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <SettingsProvider>
            <NotificationProvider>
              <Routes>
                {/* Public site */}
                <Route element={<PublicLayout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/search" element={<TripSearch />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/services" element={<Services />} />
                  <Route path="/terminals" element={<Terminals />} />
                  <Route path="/contact" element={<Contact />} />
                </Route>

                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Passenger portal */}
                <Route element={<ProtectedRoute>
                      <PortalShell portal={passengerPortal} />
                    </ProtectedRoute>}>
                  <Route path="/passenger/dashboard" element={<PassengerDashboard />} />
                  <Route path="/my-tickets" element={<MyTickets />} />
                  <Route path="/settings" element={<ProfileSettings />} />
                  <Route path="/book/:tripId" element={<BookTrip />} />
                  <Route path="/passenger" element={<Navigate to="/passenger/dashboard" replace />} />
                </Route>

                {/* Staff portal */}
                <Route element={<ProtectedRoute allowedRoles={['admin', 'staff']}>
                      <PortalShell portal={staffPortal} />
                    </ProtectedRoute>}>
                  <Route path="/staff/dashboard" element={<StaffDashboard />} />
                  <Route path="/staff/check-in" element={<CheckIn />} />
                  <Route path="/staff/pos" element={<PosTerminal />} />
                  <Route path="/staff/bookings" element={<BookingsScreen />} />
                  <Route path="/staff/tickets" element={<TicketsScreen />} />
                  <Route path="/staff/payments" element={<PaymentsScreen canRefund={false} />} />
                  <Route path="/staff/luggage" element={<LuggageScreen mode="staff" />} />
                  <Route path="/staff/parcels" element={<ParcelsScreen />} />
                  <Route path="/staff/profile" element={<ProfileSettings />} />
                  <Route path="/staff" element={<Navigate to="/staff/dashboard" replace />} />
                </Route>

                {/* Driver portal */}
                <Route element={<ProtectedRoute allowedRoles={['admin', 'driver']}>
                      <PortalShell portal={driverPortal} />
                    </ProtectedRoute>}>
                  <Route path="/driver" element={<DriverDashboard />} />
                  <Route path="/driver/trips" element={<DriverDashboard />} />
                  <Route path="/driver/trips/:tripId" element={<DriverTripDetail />} />
                  <Route path="/driver/profile" element={<ProfileSettings />} />
                </Route>

                {/* Admin portal */}
                <Route element={<ProtectedRoute allowedRoles={['admin']}>
                      <PortalShell portal={adminPortal} />
                    </ProtectedRoute>}>
                  <Route path="/admin/dashboard" element={<AdminDashboard />} />
                  <Route path="/admin/reports" element={<Reports />} />
                  <Route path="/admin/pos" element={<PosTerminal />} />
                  <Route path="/admin/bookings" element={<BookingsScreen canRefund />} />
                  <Route path="/admin/tickets" element={<TicketsScreen canVoid />} />
                  <Route path="/admin/payments" element={<PaymentsScreen />} />
                  <Route path="/admin/promo-codes" element={<PromoCodes />} />
                  <Route path="/admin/trips" element={<Trips />} />
                  <Route path="/admin/routes" element={<RoutesAdmin />} />
                  <Route path="/admin/buses" element={<Buses />} />
                  <Route path="/admin/terminals" element={<TerminalsAdmin />} />
                  <Route path="/admin/drivers" element={<Drivers />} />
                  <Route path="/admin/luggage" element={<LuggageScreen mode="admin" />} />
                  <Route path="/admin/parcels" element={<ParcelsScreen />} />
                  <Route path="/admin/users" element={<Users />} />
                  <Route path="/admin/roles" element={<Roles />} />
                  <Route path="/admin/advertisements" element={<Advertisements />} />
                  <Route path="/admin/settings" element={<SystemSettings />} />
                  <Route path="/admin/profile" element={<ProfileSettings />} />
                  <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>

              <Toaster position="top-right" richColors closeButton />
            </NotificationProvider>
          </SettingsProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>;
}