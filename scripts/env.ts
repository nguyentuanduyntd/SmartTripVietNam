// Nạp biến môi trường TRƯỚC khi bất kỳ file nào import "@/src/db".
// Lý do phải tách riêng file này: trong ESM, các import ở đầu file luôn được
// evaluate trước code còn lại của file, kể cả khi code đó đứng trước dòng import
// tiếp theo. Nếu gọi dotenv.config() trực tiếp trong seed.ts rồi mới import db,
// module db vẫn có thể chạy (và throw lỗi "Database_url is not defined") trước
// khi config() kịp chạy. Import file riêng biệt này ở dòng đầu tiên của seed.ts
// đảm bảo thứ tự đúng.
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });