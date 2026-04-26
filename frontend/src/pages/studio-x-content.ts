export type ProcessStep = {
  id: number
  title: string
  short: string
  detail: string
  image: string
}

/** Quy trình từ đăng ký đến trả xe — phù hợp đồ án cho thuê + bãi + phí nền tảng */
export const PROCESS_STEPS: ProcessStep[] = [
  {
    id: 1,
    title: 'Đăng ký & định danh',
    short:
      'Người dùng tạo tài khoản với vai trò người thuê hoặc chủ xe; hệ thống gắn quyền theo role.',
    detail:
      'Thu thập thông tin cơ bản, xác minh email và phân quyền: RENTER có thể đặt xe, OWNER có thể đăng phương tiện cho thuê.',
    image: '/studio-x/image-17e9fdb2-ecdc-4810-b430-79e9ac9c8da6.png',
  },
  {
    id: 2,
    title: 'Chủ xe đăng tin',
    short:
      'Chủ xe khai báo xe, giá, thời gian khả dụng và chọn (hoặc gắn) bãi giao — nhận xe.',
    detail:
      'Mô tả phương tiện, ảnh, biển số, chính sách; liên kết station để người thuê biết điểm nhận xe cố định.',
    image: '/studio-x/image-36fd5371-0f7b-4722-85c1-5909858347b5.png',
  },
  {
    id: 3,
    title: 'Kiểm duyệt nền tảng',
    short:
      'Admin/ hệ thống rà soát tin đăng và điều kiện bãi để đảm bảo an toàn và minh bạch.',
    detail:
      'Có thể bao gồm kiểm tra trùng biển số, trạng thái xe, và station hoạt động trước khi hiển thị công khai.',
    image: '/studio-x/image-3f6a4c78-a451-4312-9842-714013e08e43.png',
  },
  {
    id: 4,
    title: 'Người thuê tìm & đặt xe',
    short:
      'Lọc theo khu vực, thời gian, loại xe; đặt chỗ và chọn khung giờ nhận tại bãi.',
    detail:
      'Giao diện tìm kiếm kết hợp availability thực tế; renter xem rõ điểm đỗ (station) và điều khoản thuê.',
    image: '/studio-x/image-70b64552-357c-4099-b9d0-0e9e60fac1bb.png',
  },
  {
    id: 5,
    title: 'Thanh toán & phí nền tảng',
    short:
      'Người thuê thanh toán; nền tảng thu phí dịch vụ (commission) — đứng giữa hai bên.',
    detail:
      'Mô hình đồ án: một phần giá thuê giữ lại cho chủ hệ thống, phần còn lại dành cho chủ xe theo quy tắc nghiệp vụ.',
    image: '/studio-x/image-c6cdb887-89e5-4f60-912f-416dffc9349d.png',
  },
  {
    id: 6,
    title: 'Xác nhận lịch nhận xe',
    short:
      'Hệ thống gửi xác nhận; chủ xe và bãi biết khung giờ bàn giao tại station.',
    detail:
      'Thông báo cho renter, owner và (nếu có) nhân viên bãi; giảm nhầm lẫn về thời gian và vị trí.',
    image:
      'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 7,
    title: 'Nhận xe tại bãi',
    short:
      'Bàn giao xe tại điểm station đã chọn: kiểm tra thân vỏ, nhiên liệu, km.',
    detail:
      'Quy trình checklist tại bãi; renter ký nhận, trạng thái booking chuyển sang đang sử dụng.',
    image:
      'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 8,
    title: 'Trả xe & kiểm tra',
    short:
      'Trả đúng bãi; đối chiếu tình trạng xe, phụ phí nếu có (xăng, trễ giờ…).',
    detail:
      'Cập nhật trạng thái phương tiện; chuẩn bị đóng chu kỳ thuê và thanh toán cuối cho chủ xe.',
    image:
      'https://images.unsplash.com/photo-1581092335397-9583eb92d232?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 9,
    title: 'Hoàn tất & đánh giá',
    short:
      'Kết thúc đơn; hai bên có thể đánh giá — dữ liệu phục vụ uy tín trên nền tảng.',
    detail:
      'Lưu lịch sử booking, doanh thu, phí sàn; hỗ trợ báo cáo cho đồ án và vận hành thực tế sau này.',
    image:
      'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=900&q=80',
  },
]

export type BlogPost = {
  title: string
  excerpt: string
  image: string
  date: string
}

export const BLOG_POSTS: BlogPost[] = [
  {
    title: 'Vì sao nhận xe tại bãi lại quan trọng?',
    excerpt:
      'Điểm giao cố định giúp minh bạch, dễ kiểm soát an toàn và giảm tranh chấp giữa chủ xe và người thuê.',
    image:
      'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80',
    date: 'Tháng 4, 2026',
  },
  {
    title: 'Peer-to-peer: chủ xe và người thuê cùng có lợi',
    excerpt:
      'Chủ xe tận dụng tài sản; người thuê có thêm lựa chọn giá và loại xe. Nền tảng thu phí để vận hành và hỗ trợ.',
    image:
      'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=800&q=80',
    date: 'Tháng 3, 2026',
  },
  {
    title: 'Thiết kế phí nền tảng trong đồ án web thuê xe',
    excerpt:
      'Cách tách phí sàn, thời điểm khấu trừ và hiển thị cho người dùng — gợi ý triển khai trong backend của bạn.',
    image:
      'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=800&q=80',
    date: 'Tháng 2, 2026',
  },
]
