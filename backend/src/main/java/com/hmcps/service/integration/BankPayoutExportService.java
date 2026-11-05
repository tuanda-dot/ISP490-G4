package com.hmcps.service.integration;

import com.hmcps.entity.Employee;
import com.hmcps.entity.PayrollItem;
import com.hmcps.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Dịch vụ xuất tệp tin lệnh chi lương hàng loạt theo định dạng các Ngân hàng lớn (UC-269)
 * Hỗ trợ Vietcombank (VCB-iB@nk), BIDV (iBank), Techcombank Corporate
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BankPayoutExportService {

    private final EmployeeRepository employeeRepository;

    /**
     * Xuất tệp lệnh chi lương hàng loạt chuẩn định dạng Vietcombank (VCB-iB@nk Batch Payment)
     */
    public byte[] exportVietcombankBatch(List<PayrollItem> items, int month, int year) throws IOException {
        List<Long> empIds = items.stream().map(PayrollItem::getEmployeeId).toList();
        Map<Long, Employee> empMap = employeeRepository.findAllById(empIds).stream()
                .collect(Collectors.toMap(Employee::getId, e -> e));

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("VCB_Payroll_T" + month);

            // Style tiêu đề
            CellStyle headerStyle = workbook.createCellStyle();
            Font font = workbook.createFont();
            font.setBold(true);
            font.setColor(IndexedColors.WHITE.getIndex());
            headerStyle.setFont(font);
            headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);

            // Tiêu đề cột chuẩn Vietcombank
            String[] headers = {"STT", "Mã Nhân Viên", "Tên Người Thụ Hưởng", "Số Tài Khoản VCB", "Số Tiền (VND)", "Nội Dung Chuyển Khoản"};
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowIdx = 1;
            int stt = 1;
            for (PayrollItem item : items) {
                Employee emp = empMap.get(item.getEmployeeId());
                String bankAcc = emp != null && emp.getBankAccount() != null ? emp.getBankAccount() : "";
                
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(stt++);
                row.createCell(1).setCellValue(item.getEmployeeCode());
                row.createCell(2).setCellValue(item.getFullName());
                row.createCell(3).setCellValue(bankAcc);
                row.createCell(4).setCellValue(item.getThucNhan().doubleValue());
                row.createCell(5).setCellValue(String.format("HMCPS tra luong T%02d/%d", month, year));
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }

    /**
     * Xuất tệp lệnh chi lương hàng loạt chuẩn định dạng BIDV iBank
     */
    public byte[] exportBidvBatch(List<PayrollItem> items, int month, int year) throws IOException {
        List<Long> empIds = items.stream().map(PayrollItem::getEmployeeId).toList();
        Map<Long, Employee> empMap = employeeRepository.findAllById(empIds).stream()
                .collect(Collectors.toMap(Employee::getId, e -> e));

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("BIDV_Salary_T" + month);

            CellStyle headerStyle = workbook.createCellStyle();
            Font font = workbook.createFont();
            font.setBold(true);
            headerStyle.setFont(font);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);

            String[] headers = {"STT", "Số Tài Khoản", "Tên Người Thụ Hưởng", "Số Tiền", "Chi Nhánh", "Nội Dung"};
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowIdx = 1;
            int stt = 1;
            for (PayrollItem item : items) {
                Employee emp = empMap.get(item.getEmployeeId());
                String bankAcc = emp != null && emp.getBankAccount() != null ? emp.getBankAccount() : "";

                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(stt++);
                row.createCell(1).setCellValue(bankAcc);
                row.createCell(2).setCellValue(item.getFullName());
                row.createCell(3).setCellValue(item.getThucNhan().doubleValue());
                row.createCell(4).setCellValue("Hoi So");
                row.createCell(5).setCellValue(String.format("Cong ty Hai Minh chuyen luong Thang %02d/%d", month, year));
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }
}
