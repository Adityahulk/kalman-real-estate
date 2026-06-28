import 'dart:convert';
import 'dart:math';

import 'package:crypto/crypto.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/app_database.dart';
import '../../data/providers.dart';

const _passwordHashKey = 'adminPasswordHash';
const _passwordSaltKey = 'adminPasswordSalt';

final authControllerProvider = AsyncNotifierProvider<AuthController, AuthState>(AuthController.new);

class AuthState {
  const AuthState({required this.isConfigured, required this.isLoggedIn});

  final bool isConfigured;
  final bool isLoggedIn;
}

class AuthController extends AsyncNotifier<AuthState> {
  AppDatabase get _db => ref.read(databaseProvider);

  @override
  Future<AuthState> build() async {
    final hash = await _db.getSetting(_passwordHashKey);
    return AuthState(isConfigured: hash != null, isLoggedIn: false);
  }

  Future<void> createPassword(String password) async {
    _validatePassword(password);
    final salt = _randomSalt();
    await _db.setSetting(_passwordSaltKey, salt);
    await _db.setSetting(_passwordHashKey, _hash(password, salt));
    state = const AsyncData(AuthState(isConfigured: true, isLoggedIn: true));
  }

  Future<bool> login(String password) async {
    final salt = await _db.getSetting(_passwordSaltKey);
    final expectedHash = await _db.getSetting(_passwordHashKey);
    if (salt == null || expectedHash == null) {
      state = const AsyncData(AuthState(isConfigured: false, isLoggedIn: false));
      return false;
    }
    final isValid = _hash(password, salt) == expectedHash;
    if (isValid) {
      state = const AsyncData(AuthState(isConfigured: true, isLoggedIn: true));
    }
    return isValid;
  }

  Future<void> changePassword(String oldPassword, String newPassword) async {
    final valid = await login(oldPassword);
    if (!valid) throw StateError('Current password is incorrect.');
    await createPassword(newPassword);
  }

  void logout() {
    final configured = state.valueOrNull?.isConfigured ?? true;
    state = AsyncData(AuthState(isConfigured: configured, isLoggedIn: false));
  }
}

void _validatePassword(String password) {
  if (password.trim().length < 4) {
    throw ArgumentError('Password/PIN must be at least 4 characters.');
  }
}

String _randomSalt() {
  final random = Random.secure();
  final bytes = List<int>.generate(24, (_) => random.nextInt(256));
  return base64UrlEncode(bytes);
}

String _hash(String password, String salt) {
  return sha256.convert(utf8.encode('$salt:$password')).toString();
}
