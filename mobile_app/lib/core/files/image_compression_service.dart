import 'dart:math';
import 'dart:typed_data';

import 'package:image/image.dart' as img;

class ImageCompressionResult {
  const ImageCompressionResult({
    required this.bytes,
    required this.fileName,
    required this.mimeType,
  });

  final Uint8List bytes;
  final String fileName;
  final String mimeType;
}

class ImageCompressionService {
  static const int targetBytes = 500 * 1024;
  static const int maxDimension = 1280;

  Future<ImageCompressionResult> compressIfNeeded({
    required Uint8List bytes,
    required String fileName,
  }) async {
    final extension = _extensionOf(fileName);
    final isImage = {'jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'}.contains(extension);
    if (!isImage) {
      return ImageCompressionResult(
        bytes: bytes,
        fileName: fileName,
        mimeType: _mimeTypeForExtension(extension),
      );
    }

    final decoded = img.decodeImage(bytes);
    if (decoded == null) {
      return ImageCompressionResult(
        bytes: bytes,
        fileName: _forceJpgName(fileName),
        mimeType: 'image/jpeg',
      );
    }

    img.Image processed = decoded;
    if (processed.width > maxDimension || processed.height > maxDimension) {
      final ratio = min(maxDimension / processed.width, maxDimension / processed.height);
      processed = img.copyResize(
        processed,
        width: (processed.width * ratio).round(),
        height: (processed.height * ratio).round(),
        interpolation: img.Interpolation.average,
      );
    }

    var quality = 82;
    Uint8List output = Uint8List.fromList(img.encodeJpg(processed, quality: quality));

    while (output.lengthInBytes > targetBytes && quality > 18) {
      quality -= 6;
      output = Uint8List.fromList(img.encodeJpg(processed, quality: quality));
    }

    if (output.lengthInBytes > targetBytes) {
      var resized = processed;
      while (output.lengthInBytes > targetBytes &&
          resized.width > 480 &&
          resized.height > 480) {
        resized = img.copyResize(
          resized,
          width: (resized.width * 0.75).round(),
          height: (resized.height * 0.75).round(),
          interpolation: img.Interpolation.average,
        );
        output = Uint8List.fromList(img.encodeJpg(resized, quality: quality));
      }
    }

    if (output.lengthInBytes > targetBytes) {
      var resized = img.copyResize(
        processed,
        width: processed.width > 960 ? 960 : processed.width,
        height: processed.height > 960 ? 960 : processed.height,
        interpolation: img.Interpolation.average,
      );
      quality = 24;
      output = Uint8List.fromList(img.encodeJpg(resized, quality: quality));

      while (output.lengthInBytes > targetBytes &&
          resized.width > 320 &&
          resized.height > 320) {
        resized = img.copyResize(
          resized,
          width: (resized.width * 0.82).round(),
          height: (resized.height * 0.82).round(),
          interpolation: img.Interpolation.average,
        );
        output = Uint8List.fromList(img.encodeJpg(resized, quality: quality));
      }
    }

    return ImageCompressionResult(
      bytes: output,
      fileName: _forceJpgName(fileName),
      mimeType: 'image/jpeg',
    );
  }

  String _extensionOf(String fileName) {
    final dotIndex = fileName.lastIndexOf('.');
    if (dotIndex < 0 || dotIndex == fileName.length - 1) return '';
    return fileName.substring(dotIndex + 1).toLowerCase();
  }

  String _forceJpgName(String fileName) {
    final dotIndex = fileName.lastIndexOf('.');
    final baseName = dotIndex > 0 ? fileName.substring(0, dotIndex) : fileName;
    return '$baseName.jpg';
  }

  String _mimeTypeForExtension(String extension) {
    return switch (extension) {
      'png' => 'image/png',
      'jpg' || 'jpeg' => 'image/jpeg',
      'pdf' => 'application/pdf',
      _ => 'application/octet-stream',
    };
  }
}
