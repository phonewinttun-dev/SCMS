import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/auth_repository.dart';
import '../domain/auth_session.dart';

final authControllerProvider =
    AsyncNotifierProvider<AuthController, AuthSession?>(AuthController.new);

class AuthController extends AsyncNotifier<AuthSession?> {
  @override
  FutureOr<AuthSession?> build() {
    return ref.watch(authRepositoryProvider).restoreSession();
  }

  Future<void> signIn({required String emailOrMobile, required String password}) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => ref
          .read(authRepositoryProvider)
          .signIn(emailOrMobile: emailOrMobile, password: password),
    );
  }

  /// Register a new patient account, then auto-sign in.
  Future<void> signUp({
    required String name,
    required String email,
    required String password,
    String? mobileNo,
  }) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final repo = ref.read(authRepositoryProvider);
      await repo.register(
        name: name,
        email: email,
        password: password,
        mobileNo: mobileNo,
      );
      // Auto sign-in after successful registration.
      return repo.signIn(emailOrMobile: email, password: password);
    });
  }

  Future<void> signOut() async {
    await ref.read(authRepositoryProvider).signOut();
    state = const AsyncData(null);
  }
}
