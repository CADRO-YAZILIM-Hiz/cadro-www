enum AuthStatus {
  unknown,
  unauthenticated,
  mfaRequired,
  authenticated,
}

String resolveHomeRoute(String? role) {
  final normalized = (role ?? '').toUpperCase();
  if (normalized == 'MANAGER' ||
      normalized == 'HR' ||
      normalized == 'ADMIN' ||
      normalized == 'SUPERADMIN') {
    return '/admin-home';
  }
  return '/home';
}

class AuthState {
  const AuthState({
    this.status = AuthStatus.unknown,
    this.email,
    this.name,
    this.role,
    this.userId,
    this.deactivatedDeviceCount,
    this.errorMessage,
    this.isLoading = false,
  });

  final AuthStatus status;
  final String? email;
  final String? name;
  final String? role;
  final int? userId;
  final int? deactivatedDeviceCount;
  final String? errorMessage;
  final bool isLoading;

  AuthState copyWith({
    AuthStatus? status,
    String? email,
    String? name,
    String? role,
    int? userId,
    int? deactivatedDeviceCount,
    String? errorMessage,
    bool? isLoading,
    bool clearError = false,
    bool clearDeviceSwitchNotice = false,
  }) {
    return AuthState(
      status: status ?? this.status,
      email: email ?? this.email,
      name: name ?? this.name,
      role: role ?? this.role,
      userId: userId ?? this.userId,
      deactivatedDeviceCount: clearDeviceSwitchNotice
          ? null
          : (deactivatedDeviceCount ?? this.deactivatedDeviceCount),
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      isLoading: isLoading ?? this.isLoading,
    );
  }
}
