import '../config/api_contract.dart';

class AuthUser {
  const AuthUser({
    required this.id,
    required this.name,
    required this.email,
    required this.roles,
  });

  final int id;
  final String name;
  final String email;
  final List<String> roles;

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    final roles = (json['roles'] as List<dynamic>? ?? [])
        .map((role) => readJsonString((role as Map<String, dynamic>)['name']))
        .where((name) => name.isNotEmpty)
        .toList();

    return AuthUser(
      id: readJsonInt(json['id']),
      name: readJsonString(json['name']),
      email: readJsonString(json['email']),
      roles: roles,
    );
  }
}
