import { Context, Schema } from 'koishi';
export declare const name = "azi-bangdream-cck";
export interface Config {
    phrase_timeout: string[];
    phrase_answered: string[];
    phrase_bzd: string[];
    card_path: string;
    croppedcard_path: string;
}
export declare const Config: Schema<Config>;
export declare const usage = "\n<h1>\u90A6\u591A\u5229\u731C\u731C\u770B\uFF08\u90A6\u90A6\u731C\uFF09</h1>\n<h2>\u5361\u9762\u56FE\u7247\u6765\u6E90\u4E8E\u300Cbestdori.com\u300D</h2>\n<h4>Notice\uFF01</h4>\n\u5F00\u53D1\u8FC7\u7A0B\u4E2D\uFF0C\u5982\u9047bug\u8BF7\u6839\u636E\u63D0\u793A\u6E05\u9664\u6570\u636E\u5E93\u5E76\u91CD\u5F00\u6E38\u620F\uFF01</br>\n\u76EE\u524D\u53EA\u6709\u672C\u5730\u73AF\u5883\u5E73\u53F0onebot\u6D4B\u8BD5\u8FD0\u884C\u8FC7\uFF0C\u4E0D\u4FDD\u8BC1\u5176\u4F59\u65B9\u5F0F\u6210\u529F\u8FD0\u884C\n<h4>Thanks</h4>\n\u5F00\u53D1\u8FC7\u7A0B\u4E2D\u53C2\u8003\u63D2\u4EF6koishi-plugin-cck (\u4F5C\u8005kumoSleeping)\n";
export declare const inject: {
    required: string[];
    optional: string[];
};
declare module 'koishi' {
    interface Tables {
        bangguess_user: Bangguess_user;
    }
}
export interface Bangguess_user {
    id: number;
    platform: string;
    userId: string;
    guildId: string;
    time: Date;
}
export declare function apply(ctx: Context, config: Config): void;
