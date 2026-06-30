import 'dart:io';

import 'package:flutter/services.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

Future<Directory> appWritableDirectory([String? childPath]) async {
  final base = await _documentsDirectoryWithFallback();
  final dir = childPath == null || childPath.isEmpty
      ? base
      : Directory(p.join(base.path, childPath));
  if (!await dir.exists()) {
    await dir.create(recursive: true);
  }
  return dir;
}

Future<File> appWritableFile({
  required String fileName,
  String? directoryPath,
}) async {
  final dir = await appWritableDirectory(directoryPath);
  return File(p.join(dir.path, fileName));
}

Future<Directory> _documentsDirectoryWithFallback() async {
  try {
    return await getApplicationDocumentsDirectory();
  } on MissingPluginException {
    return Directory.systemTemp;
  } on UnsupportedError {
    return Directory.systemTemp;
  } on FileSystemException {
    return Directory.systemTemp;
  }
}

String safeFileSegment(String input) =>
    input.replaceAll(RegExp(r'[^a-zA-Z0-9_-]+'), '_');
