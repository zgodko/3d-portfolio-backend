from pathlib import Path

from PIL import Image, UnidentifiedImageError

SUPPORTED_EXTENSIONS = {'.jpg', '.jpeg',
                        '.png', '.webp', '.bmp', '.tiff', '.tif'}
QUALITY = 85
SCALE_FACTOR = 0.5


def process_image(path: Path) -> None:
    try:
        with Image.open(path) as image:
            original_size = image.size
            new_size = (
                max(1, int(original_size[0] * SCALE_FACTOR)),
                max(1, int(original_size[1] * SCALE_FACTOR)),
            )
            if new_size != original_size:
                image = image.resize(new_size, Image.LANCZOS)

            save_kwargs = {'optimize': True}
            image_format = image.format or path.suffix.replace('.', '').upper()

            if image_format in {'JPEG', 'JPG', 'WEBP'}:
                save_kwargs['quality'] = QUALITY
            elif image_format == 'PNG':
                save_kwargs['compress_level'] = 6

            if image.mode in {'RGBA', 'LA'} and image_format in {'JPEG', 'JPG'}:
                image = image.convert('RGB')

            image.save(path, format=image_format, **save_kwargs)
            print(f'Processed: {path} ({original_size} → {new_size})')
    except UnidentifiedImageError:
        print(f'Skipped (not image): {path}')
    except Exception as exc:
        print(f'Error processing {path}: {exc}')


def main() -> None:
    root = Path(__file__).resolve().parent / 'images'
    if not root.exists():
        raise SystemExit(f'Images folder not found: {root}')

    files = sorted(p for p in root.rglob('*') if p.is_file()
                   and p.suffix.lower() in SUPPORTED_EXTENSIONS)
    print(f'Found {len(files)} image files in {root}')

    for path in files:
        process_image(path)


if __name__ == '__main__':
    main()
