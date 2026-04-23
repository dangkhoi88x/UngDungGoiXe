package com.example.ungdunggoixe.service.implement;

import com.example.ungdunggoixe.service.MailService;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.io.UnsupportedEncodingException;
import java.util.Date;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class MailServiceImplement implements MailService {

    @Value("${spring.mail.username:}")
    private String from;

    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;

    @Override
    @Async
    public void sendMail(String to, String subject, String body) {
        if (from == null || from.isBlank()) {
            log.warn("Skip plain email send because spring.mail.username is empty.");
            return;
        }
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(to);
        message.setSubject(subject);
        message.setText(body);
        message.setSentDate(new Date());
        mailSender.send(message);
    }

    @Override
    @Async
    public void sendEmailWithTemplate(
            String to,
            String subject,
            String templateName,
            Map<String, Object> variables
    ) {
        if (from == null || from.isBlank()) {
            log.warn("Skip template email send because spring.mail.username is empty.");
            return;
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");

            Context context = new Context();
            if (variables != null) {
                variables.forEach(context::setVariable);
            }

            String html = templateEngine.process(templateName, context);

            helper.setFrom(from, "Thue Xe Tu Lai");
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true);

            mailSender.send(message);
        } catch (MessagingException | UnsupportedEncodingException | MailException e) {
            log.error("Send template email failed to={}", to, e);
        }
    }
}