using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.AspNetCore.Http;
using SCMS.Shared;

namespace SCMS.Domain.Features.Photo
{
    public class PhotoService : IPhotoService
    {
        private readonly Cloudinary? _cloudinary;
        private const long MaxFileSizeBytes = 5 * 1024 * 1024; // 5 MB
        private static readonly string[] AllowedContentTypes = { "image/jpeg", "image/png", "image/webp", "image/jpg" };
        private static readonly string[] AllowedExtensions = { ".jpg", ".jpeg", ".png", ".webp" };

        public PhotoService(Cloudinary? cloudinary = null)
        {
            _cloudinary = cloudinary;
        }

        public async Task<Result<PhotoUploadResult>> UploadPhotoAsync(IFormFile file, string folder = "scms/medicines")
        {
            if (file == null || file.Length == 0)
            {
                return Result<PhotoUploadResult>.Failure("No file was uploaded.");
            }

            if (file.Length > MaxFileSizeBytes)
            {
                return Result<PhotoUploadResult>.Failure("File size exceeds the maximum allowed limit of 5 MB.");
            }

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedExtensions.Contains(extension) || (!string.IsNullOrEmpty(file.ContentType) && !AllowedContentTypes.Contains(file.ContentType.ToLowerInvariant())))
            {
                return Result<PhotoUploadResult>.Failure("Invalid file type. Only JPEG, PNG, and WebP images are allowed.");
            }

            try
            {
                if (_cloudinary != null)
                {
                    using var stream = file.OpenReadStream();
                    var uploadParams = new ImageUploadParams
                    {
                        File = new FileDescription(file.FileName, stream),
                        Folder = folder,
                        Transformation = new Transformation().Width(1200).Height(1200).Crop("limit")
                    };

                    var uploadResult = await _cloudinary.UploadAsync(uploadParams);

                    if (uploadResult.Error != null)
                    {
                        return Result<PhotoUploadResult>.Failure($"Cloudinary upload error: {uploadResult.Error.Message}");
                    }

                    var result = new PhotoUploadResult
                    {
                        PublicId = uploadResult.PublicId,
                        Url = uploadResult.SecureUrl.ToString()
                    };

                    return Result<PhotoUploadResult>.Success(result, "Photo uploaded successfully.");
                }
                else
                {
                    // Fallback to local static file storage when Cloudinary is not configured
                    var cleanFolder = folder.Replace('/', Path.DirectorySeparatorChar).Replace('\\', Path.DirectorySeparatorChar);
                    var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", cleanFolder);
                    Directory.CreateDirectory(uploadsDir);

                    var uniqueFileName = $"{Guid.NewGuid()}{extension}";
                    var filePath = Path.Combine(uploadsDir, uniqueFileName);

                    using (var localStream = new FileStream(filePath, FileMode.Create))
                    {
                        await file.CopyToAsync(localStream);
                    }

                    var relativeUrl = $"/uploads/{folder.Trim('/')}/{uniqueFileName}";
                    return Result<PhotoUploadResult>.Success(new PhotoUploadResult
                    {
                        PublicId = uniqueFileName,
                        Url = relativeUrl
                    }, "Photo uploaded successfully.");
                }
            }
            catch (Exception ex)
            {
                return Result<PhotoUploadResult>.Failure($"Failed to upload photo: {ex.Message}");
            }
        }

        public async Task<Result> DeletePhotoAsync(string publicId)
        {
            if (string.IsNullOrWhiteSpace(publicId))
            {
                return Result.Success("No photo to delete."); // Treat empty as success to simplify flow
            }

            try
            {
                if (_cloudinary != null)
                {
                    var deleteParams = new DeletionParams(publicId);
                    var deleteResult = await _cloudinary.DestroyAsync(deleteParams);

                    if (deleteResult.Error != null)
                    {
                        return Result.Failure($"Cloudinary delete error: {deleteResult.Error.Message}");
                    }

                    if (deleteResult.Result == "ok" || deleteResult.Result == "not_found")
                    {
                        return Result.Success("Photo deleted successfully.");
                    }

                    return Result.Failure($"Failed to delete photo. Cloudinary status: {deleteResult.Result}");
                }
                else
                {
                    // Local delete if file exists
                    var files = Directory.GetFiles(Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads"), publicId + "*", SearchOption.AllDirectories);
                    foreach (var f in files)
                    {
                        File.Delete(f);
                    }
                    return Result.Success("Photo deleted successfully.");
                }
            }
            catch (Exception ex)
            {
                return Result.Failure($"Failed to delete photo: {ex.Message}");
            }
        }
    }
}
