/**
 * @vitest-environment jsdom
 */
import {afterEach,describe,expect,it,vi} from "vitest";
import {cleanup,render,screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {ConfirmDialog} from "@/src/components/ui/ConfirmDialog";

afterEach(() => {
    cleanup();
});

describe("ConfirmDialog", () => {
    const defaultProps = {
        open: true,
        title: "Xóa story",
        description: "Story sẽ bị xóa vĩnh viễn.",
        onConfirm: vi.fn(),
        onCancel: vi.fn(),
    };

    it("không render khi open=false", () => {
        render(
            <ConfirmDialog
                {...defaultProps}
                open={false}
            />,
        );

        expect(
            screen.queryByRole("alertdialog"),
        ).not.toBeInTheDocument();
    });

    it("hiển thị tiêu đề, mô tả và nhãn mặc định", () => {
        render(<ConfirmDialog {...defaultProps} />);

        expect(
            screen.getByRole("alertdialog", {
                name: "Xóa story",
            }),
        ).toBeInTheDocument();
        expect(
            screen.getByText("Story sẽ bị xóa vĩnh viễn."),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", {
                name: "Xác nhận xóa",
            }),
        ).toBeEnabled();
        expect(
            screen.getByRole("button", { name: "Hủy" }),
        ).toBeEnabled();
    });

    it("gọi đúng callback khi người dùng bấm nút", async () => {
        const user = userEvent.setup();
        const onConfirm = vi.fn();
        const onCancel = vi.fn();

        render(
            <ConfirmDialog
                {...defaultProps}
                onConfirm={onConfirm}
                onCancel={onCancel}
            />,
        );

        await user.click(
            screen.getByRole("button", {
                name: "Xác nhận xóa",
            }),
        );
        await user.click(
            screen.getByRole("button", { name: "Hủy" }),
        );

        expect(onConfirm).toHaveBeenCalledOnce();
        expect(onCancel).toHaveBeenCalledOnce();
    });

    it("khóa thao tác và đổi nhãn khi loading", () => {
        render(
            <ConfirmDialog
                {...defaultProps}
                loading
            />,
        );

        expect(
            screen.getByRole("button", {
                name: "Đang xóa…",
            }),
        ).toBeDisabled();
        expect(
            screen.getByRole("button", { name: "Hủy" }),
        ).toBeDisabled();
    });

    it("hỗ trợ nhãn tùy chỉnh và chế độ không nguy hiểm", () => {
        render(
            <ConfirmDialog
                {...defaultProps}
                danger={false}
                confirmLabel="Đồng ý"
                cancelLabel="Quay lại"
            />,
        );

        const dialog = screen.getByRole("alertdialog");

        expect(
            screen.getByRole("button", { name: "Đồng ý" }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Quay lại" }),
        ).toBeInTheDocument();
        expect(dialog.querySelector("svg")).toBeNull();
    });
});
