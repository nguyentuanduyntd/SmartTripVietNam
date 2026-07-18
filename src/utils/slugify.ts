export function slugify(input: string): string{
    return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "") // bỏ ký tự đặc biệt
        .replace(/\s+/g, "-") // khoảng trắng -> gạch ngang
        .replace(/-+/g, "-") // gộp nhiều gạch ngang liên tiếp
        .replace(/^-+|-+$/g, ""); // bỏ gạch ngang ở đầu/cuối
}