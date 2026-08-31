/**
 * @vitest-environment jsdom
 */

import {
    afterEach,
    describe,
    expect,
    it,
} from "vitest";
import {
    cleanup,
    render,
    screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
    Mail,
} from "lucide-react";

import {
    AuthAlert,
    AuthDivider,
    AuthPasswordField,
    AuthSubmitButton,
    AuthTextField,
    GoogleAuthButton,
    PasswordRequirements,
} from "@/src/components/auth/AuthFormControls";

afterEach(() => {
    cleanup();
});

describe("AuthFormControls", () => {
    describe("AuthTextField", () => {
        it("liên kết label với input và nhận dữ liệu người dùng", async () => {
            const user = userEvent.setup();

            render(
                <AuthTextField
                    id="email"
                    label="Email"
                    icon={Mail}
                    placeholder="you@example.com"
                    labelAction={<span>Email đăng ký</span>}
                />,
            );

            const input = screen.getByRole("textbox", {
                name: "Email",
            });

            await user.type(input, "user@example.com");

            expect(input).toHaveValue("user@example.com");
            expect(input).not.toHaveAttribute("aria-invalid");
            expect(
                screen.getByText("Email đăng ký"),
            ).toBeInTheDocument();
        });

        it("đánh dấu input không hợp lệ", () => {
            render(
                <AuthTextField
                    id="invalid-email"
                    label="Email"
                    icon={Mail}
                    invalid
                />,
            );

            expect(
                screen.getByRole("textbox", { name: "Email" }),
            ).toHaveAttribute("aria-invalid", "true");
        });
    });

    describe("AuthPasswordField", () => {
        it("ẩn mật khẩu mặc định và cho phép hiện/ẩn", async () => {
            const user = userEvent.setup();

            render(
                <AuthPasswordField
                    id="password"
                    label="Mật khẩu"
                />,
            );

            const input = screen.getByLabelText("Mật khẩu");

            expect(input).toHaveAttribute("type", "password");

            await user.click(
                screen.getByRole("button", {
                    name: "Hiện mật khẩu",
                }),
            );

            expect(input).toHaveAttribute("type", "text");
            expect(
                screen.getByRole("button", {
                    name: "Ẩn mật khẩu",
                }),
            ).toBeInTheDocument();

            await user.click(
                screen.getByRole("button", {
                    name: "Ẩn mật khẩu",
                }),
            );

            expect(input).toHaveAttribute("type", "password");
        });

        it("khóa input và nút hiện mật khẩu khi disabled", () => {
            render(
                <AuthPasswordField
                    id="new-password"
                    label="Mật khẩu mới"
                    showLabel="Xem mật khẩu mới"
                    hideLabel="Ẩn mật khẩu mới"
                    invalid
                    disabled
                />,
            );

            expect(
                screen.getByLabelText("Mật khẩu mới"),
            ).toBeDisabled();
            expect(
                screen.getByLabelText("Mật khẩu mới"),
            ).toHaveAttribute("aria-invalid", "true");
            expect(
                screen.getByRole("button", {
                    name: "Xem mật khẩu mới",
                }),
            ).toBeDisabled();
        });
    });

    it("hiển thị thông báo lỗi với role alert", () => {
        render(
            <AuthAlert>Email hoặc mật khẩu không đúng</AuthAlert>,
        );

        expect(screen.getByRole("alert")).toHaveTextContent(
            "Email hoặc mật khẩu không đúng",
        );
    });

    it("đổi nội dung nút submit theo trạng thái loading", () => {
        const { rerender } = render(
            <AuthSubmitButton loadingLabel="Đang đăng nhập...">
                Đăng nhập
            </AuthSubmitButton>,
        );

        expect(
            screen.getByRole("button", { name: "Đăng nhập" }),
        ).toHaveAttribute("type", "submit");
        expect(
            screen.getByRole("button").querySelector("svg"),
        ).not.toBeNull();

        rerender(
            <AuthSubmitButton
                loading
                disabled
                loadingLabel="Đang đăng nhập..."
            >
                Đăng nhập
            </AuthSubmitButton>,
        );

        expect(
            screen.getByRole("button", {
                name: "Đang đăng nhập...",
            }),
        ).toBeDisabled();
        expect(
            screen.getByRole("button").querySelector("svg"),
        ).toBeNull();

        rerender(
            <AuthSubmitButton
                loadingLabel="Đang đăng nhập..."
                showArrow={false}
            >
                Đăng nhập
            </AuthSubmitButton>,
        );

        expect(
            screen.getByRole("button").querySelector("svg"),
        ).toBeNull();
    });

    it("hiển thị divider và nút đăng nhập Google", () => {
        const { rerender } = render(
            <>
                <AuthDivider>Hoặc</AuthDivider>
                <GoogleAuthButton />
            </>,
        );

        expect(screen.getByText("Hoặc")).toBeInTheDocument();
        expect(
            screen.getByRole("button", {
                name: "Tiếp tục với Google",
            }),
        ).toHaveAttribute("type", "button");

        rerender(
            <GoogleAuthButton
                loading
                disabled
            />,
        );

        expect(
            screen.getByRole("button", {
                name: "Đang kết nối Google...",
            }),
        ).toBeDisabled();
    });

    it("hiển thị đầy đủ các điều kiện mật khẩu", () => {
        render(
            <PasswordRequirements
                checks={{
                    length: true,
                    letter: false,
                    number: true,
                }}
            />,
        );

        expect(screen.getByText("8 ký tự")).toBeInTheDocument();
        expect(screen.getByText("Có chữ")).toBeInTheDocument();
        expect(screen.getByText("Có số")).toBeInTheDocument();
    });
});