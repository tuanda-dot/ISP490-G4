# 📌 Đồ Án Tốt Nghiệp ISP490 - Nhóm 4 (ISP490-G4)

Hệ thống quản lý thông tin nhân sự và vận hành doanh nghiệp (**HMCPS**).

---

## 🛠️ Công nghệ & Thư viện chính (Tech Stack)

### 🔹 Backend
- **Ngôn ngữ:** Java (JDK 17+)
- **Framework cốt lõi:** Spring Boot 3.x
  - **Spring Web:** Xây dựng hệ thống RESTful API
  - **Spring Security:** Quản lý xác thực và phân quyền (RBAC)
  - **Spring Data JPA / Hibernate:** Tương tác và quản lý cơ sở dữ liệu quan hệ
- **Thư viện hỗ trợ:**
  - **Lombok:** Tự động tạo getter, setter, constructor, builder nhằm tối ưu mã nguồn
  - **Jakarta Validation:** Kiểm tra ràng buộc và tính hợp lệ của dữ liệu đầu vào (DTO)

### 🔹 Frontend
- **Thư viện UI cốt lõi:** React (React 18+)
- **Ngôn ngữ:** TypeScript
- **Bộ icon:** Lucide React
- **Quản lý trạng thái:** React Context API & React Hooks
- **Kiểu dáng & Công cụ đóng gói:** Tailwind CSS / Vite

### 🔹 Cơ sở dữ liệu (Database)
- **Hệ quản trị CSDL:** Relational Database (MySQL / PostgreSQL)
- **Quản lý cấu trúc:** Thư mục script migrations phục vụ đồng bộ schema

---

## 🎯 Tính năng cốt lõi dự kiến (Planned Core Features)

> *Danh sách tính năng hiện đang được để trống làm placeholder theo kế hoạch và sẽ được cập nhật chi tiết sau.*

- *(Chưa có tính năng nào được chỉ định)*

---

## 🗺️ Lộ trình phát triển (Roadmap)

> *Kế hoạch lộ trình các giai đoạn / sprint hiện đang là placeholder và sẽ được bổ sung sau.*

- *(Lộ trình phát triển dự án sẽ sớm được cập nhật)*

---

## 📂 Cấu trúc dự án hiện tại (Project Structure)

```text
ISP490-G4/
├── backend/
│   └── src/
│       ├── main/
│       │   ├── java/com/hmcps/
│       │   │   ├── common/            # DTOs, Enums, Cấu hình chung, Utilities
│       │   │   ├── controller/        # REST Controllers (Auth, Employee, Department, ...)
│       │   │   ├── entity/            # JPA Entities (Employee, Contract, Department, ...)
│       │   │   ├── repository/        # Spring Data JPA Repositories
│       │   │   ├── security/          # Cấu hình bảo mật, JWT & UserPrincipal
│       │   │   └── service/           # Business Logic Layer
│       │   └── resources/             # Cấu hình ứng dụng (application.properties/yml)
│       └── test/                      # Unit Tests & Integration Tests
├── frontend/
│   ├── public/                        # Tài nguyên tĩnh (Static assets)
│   └── src/
│       ├── components/                # UI Components tái sử dụng
│       ├── context/                   # Context Providers (AuthContext, ...)
│       ├── pages/                     # Màn hình chức năng (Employees, ...)
│       ├── services/                  # Xử lý gọi API & Mock Data
│       └── types/                     # Định nghĩa kiểu dữ liệu TypeScript (Interfaces, Types)
└── database/
    └── migrations/                    # Scripts khởi tạo và migration database
```

---

## 👥 Thành viên nhóm (Team Members - Group 4)

Click vào tên thành viên để chuyển trực tiếp đến trang cá nhân GitHub:

- [Lê Phương Hà](https://github.com/lephuongha63)
- [Đinh Anh Tuấn](https://github.com/tuanda-dot)
- [Nguyễn Lương Gia Phát](https://github.com/GiaPhat0989)
- [Nguyễn Huy Thịnh](https://github.com/Thinh-XD)
- [Nguyễn Trường Giang](https://github.com/Giang285)

| STT | Họ và tên | GitHub Profile |
| :---: | :--- | :--- |
| 1 | [Lê Phương Hà](https://github.com/lephuongha63) | [@lephuongha63](https://github.com/lephuongha63) |
| 2 | [Đinh Anh Tuấn](https://github.com/tuanda-dot) | [@tuanda-dot](https://github.com/tuanda-dot) |
| 3 | [Nguyễn Lương Gia Phát](https://github.com/GiaPhat0989) | [@GiaPhat0989](https://github.com/GiaPhat0989) |
| 4 | [Nguyễn Huy Thịnh](https://github.com/Thinh-XD) | [@Thinh-XD](https://github.com/Thinh-XD) |
| 5 | [Nguyễn Trường Giang](https://github.com/Giang285) | [@Giang285](https://github.com/Giang285) |
